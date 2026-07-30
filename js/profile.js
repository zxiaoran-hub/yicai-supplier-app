/**
 * 我的主页（供应商档案）
 */
const profile = {
  async load() {
    if (!state.supplier) return;
    const s = state.supplier;

    // 基本信息
    document.getElementById('profile-avatar-text').textContent = (s.short_name || s.company_name).charAt(0);
    document.getElementById('profile-company-name').textContent = s.company_name;
    document.getElementById('profile-region').textContent = s.region;
    document.getElementById('profile-tags').innerHTML = (s.category || []).map(c => `<span class="profile-tag">${c}</span>`).join('');

    // 企业信息
    document.getElementById('info-established').textContent = s.established_year ? s.established_year + '年' : '-';
    document.getElementById('info-employees').textContent = s.employee_count ? s.employee_count + '人' : '-';
    document.getElementById('info-area').textContent = s.factory_area ? s.factory_area + '㎡' : '-';
    document.getElementById('info-region').textContent = s.region || '-';
    document.getElementById('info-address').textContent = s.address || '-';
    document.getElementById('info-desc').textContent = s.description || '-';

    // 联系方式
    document.getElementById('info-contact-name').textContent = s.contact_name || '-';
    document.getElementById('info-contact-phone').textContent = s.contact_phone || '-';
    document.getElementById('info-contact-email').textContent = s.contact_email || '-';

    // 认证状态
    document.getElementById('info-verified').innerHTML = s.is_verified
      ? '<span class="badge badge-success">✅ 已认证</span>'
      : '<span class="badge badge-warning">⏳ 待认证</span>';

    // 工厂照片
    const photos = s.factory_photos || [];
    const photosHtml = photos.map(url => `
      <div class="photo-item"><img src="${url}" alt="工厂照片"></div>
    `).join('');
    document.getElementById('factory-photos').innerHTML = photosHtml + `
      <div class="photo-add" onclick="document.getElementById('factory-photo-input').click()">
        <div class="photo-add-icon">+</div>
        <div class="photo-add-text">添加照片</div>
      </div>
    `;

    // 资质证书
    const certs = s.certifications || [];
    const certImages = s.cert_images || [];
    const certHtml = certImages.map((url, i) => `
      <div class="photo-item"><img src="${url}" alt="证书"></div>
    `).join('');
    document.getElementById('cert-images').innerHTML = certHtml + `
      <div class="photo-add" onclick="document.getElementById('cert-input').click()">
        <div class="photo-add-icon">+</div>
        <div class="photo-add-text">上传证书</div>
      </div>
    `;
  },

  async handleFactoryPhoto(input) {
    const file = input.files[0];
    if (!file) return;
    showToast('上传中...');
    try {
      const url = await uploadImage(file, 'factory');
      const photos = state.supplier.factory_photos || [];
      photos.push(url);
      await db.from('suppliers').update({ factory_photos: photos }).eq('id', state.supplier.id);
      state.supplier.factory_photos = photos;
      showToast('照片上传成功 ✅');
      this.load();
    } catch (e) {
      showToast('上传失败: ' + e.message);
    }
    input.value = '';
  },

  async handleCertUpload(input) {
    const file = input.files[0];
    if (!file) return;
    showToast('上传中...');
    try {
      const url = await uploadImage(file, 'certs');
      const images = state.supplier.cert_images || [];
      images.push(url);
      await db.from('suppliers').update({ cert_images: images }).eq('id', state.supplier.id);
      state.supplier.cert_images = images;
      showToast('证书上传成功 ✅');
      this.load();
    } catch (e) {
      showToast('上传失败: ' + e.message);
    }
    input.value = '';
  },

  showEditForm() {
    const s = state.supplier;
    document.getElementById('edit-company-name').value = s.company_name || '';
    document.getElementById('edit-region').value = s.region || '';
    document.getElementById('edit-address').value = s.address || '';
    document.getElementById('edit-description').value = s.description || '';
    document.getElementById('edit-established').value = s.established_year || '';
    document.getElementById('edit-employees').value = s.employee_count || '';
    document.getElementById('edit-area').value = s.factory_area || '';
    document.getElementById('edit-contact-name').value = s.contact_name || '';
    document.getElementById('edit-contact-phone').value = s.contact_phone || '';
    document.getElementById('edit-contact-email').value = s.contact_email || '';
    showModal('edit-profile-modal');
  },

  async saveProfile() {
    const updates = {
      company_name: document.getElementById('edit-company-name').value.trim(),
      region: document.getElementById('edit-region').value.trim(),
      address: document.getElementById('edit-address').value.trim(),
      description: document.getElementById('edit-description').value.trim(),
      established_year: parseInt(document.getElementById('edit-established').value) || null,
      employee_count: parseInt(document.getElementById('edit-employees').value) || null,
      factory_area: parseInt(document.getElementById('edit-area').value) || null,
      contact_name: document.getElementById('edit-contact-name').value.trim(),
      contact_phone: document.getElementById('edit-contact-phone').value.trim(),
      contact_email: document.getElementById('edit-contact-email').value.trim(),
      updated_at: new Date().toISOString()
    };

    if (!updates.company_name) { showToast('公司名称不能为空'); return; }

    try {
      const { error } = await db.from('suppliers').update(updates).eq('id', state.supplier.id);
      if (error) throw error;
      Object.assign(state.supplier, updates);
      showToast('保存成功 ✅');
      hideModal('edit-profile-modal');
      this.load();
    } catch (e) {
      showToast('保存失败: ' + e.message);
    }
  }
};
