document.addEventListener('DOMContentLoaded', async () => {
  const config = JSON.parse(sessionStorage.getItem('recitativos_config'));
  if (!config) {
    window.location.href = '/';
    return;
  }

  const container = document.getElementById('cardsContainer');
  const summary = document.getElementById('selectionSummary');
  const datePickerRow = document.getElementById('datePickerRow');
  const selectedDateSelect = document.getElementById('selectedDate');
  const headerSubtitle = document.getElementById('headerSubtitle');

  window.updateSummaryWithName = async (user) => {
    let name = user.user_metadata?.full_name;
    
    // Se não tiver no metadata, tenta buscar na tabela rjm_auxiliares via API
    if (!name) {
      try {
        const res = await fetch(`/api/profile?id=${user.id}`);
        const profile = await res.json();
        if (profile.full_name) {
          name = profile.full_name;
        }
      } catch (err) {
        console.error('Erro ao buscar nome completo:', err);
      }
    }

    if (!name) name = user.email?.split('@')[0] || '...';

    // Capitalizar e formatar ricardograngeiro -> Ricardo Grangeiro
    if (name.toLowerCase() === 'ricardograngeiro') name = 'Ricardo Grangeiro';
    else if (name.includes('.')) name = name.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    else if (!user.user_metadata?.full_name) name = name.charAt(0).toUpperCase() + name.slice(1);

    // Salvar no escopo para o submit
    window.auxiliarFullName = name;

    summary.innerHTML = `
      <strong>Mês:</strong> ${config.mes} | 
      <strong>Município:</strong> ${config.municipio} | 
      <strong>Comum:</strong> ${config.comum} <br>
      <span style="color: var(--brand); font-weight: 700;">Auxiliar: ${name}</span>
    `;
  };

  if (window.currentUser) {
    await window.updateSummaryWithName(window.currentUser);
  }


  function createCard(dateLabel, index) {
    const card = document.createElement('div');
    card.className = 'sunday-card';
    card.innerHTML = `
      <div class="sunday-card-title">${dateLabel}</div>
      <input type="hidden" name="date_${index}" value="${dateLabel}">
      <div class="grid-counts">
        <div class="form-group">
          <label>Meninas Recitaram</label>
          <input type="number" name="meninas_${index}" min="0" value="0" required class="count-input">
        </div>
        <div class="form-group">
          <label>Meninos Recitaram</label>
          <input type="number" name="meninos_${index}" min="0" value="0" required class="count-input">
        </div>
        <div class="form-group">
          <label>Moças Recitaram</label>
          <input type="number" name="mocas_${index}" min="0" value="0" required class="count-input">
        </div>
        <div class="form-group">
          <label>Moços Recitaram</label>
          <input type="number" name="mocos_${index}" min="0" value="0" required class="count-input">
        </div>
        <div class="form-group">
          <label>Total de Recitativos</label>
          <input type="number" name="total_recitativos_${index}" value="0" readonly style="background: #f8fafc; font-weight: bold; color: var(--brand);">
        </div>
        <div class="form-group">
          <label>Total de Comparecimento</label>
          <input type="number" name="total_comparecimento_${index}" min="0" value="0" required>
        </div>
      </div>
    `;

    // Adicionar listener para cálculo automático
    const inputs = card.querySelectorAll('.count-input');
    const totalField = card.querySelector(`input[name="total_recitativos_${index}"]`);
    
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        let sum = 0;
        inputs.forEach(i => sum += parseInt(i.value || 0));
        totalField.value = sum;
      });
    });

    return card;
  }

  if (config.type === 'all') {
    config.sundays.forEach((date, i) => {
      container.appendChild(createCard(`Domingo ${i + 1} (${date})`, i));
    });
  } else {
    datePickerRow.classList.remove('hidden');
    config.sundays.forEach(date => {
      const opt = document.createElement('option');
      opt.value = date;
      opt.textContent = date;
      selectedDateSelect.appendChild(opt);
    });

    selectedDateSelect.addEventListener('change', (e) => {
      container.innerHTML = '';
      if (e.target.value) {
        container.appendChild(createCard(`Data: ${e.target.value}`, 0));
      }
    });
  }

  const form = document.getElementById('recitativosForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = window.currentUser;
    if (!user) {
      Swal.fire('Erro', 'Você precisa estar logado para enviar.', 'error');
      return;
    }

    const formData = new FormData(form);
    const rawData = Object.fromEntries(formData.entries());
    
    // Agrupar lançamentos
    const entries = [];
    if (config.type === 'all') {
      config.sundays.forEach((_, i) => {
        entries.push({
          data_reuniao: rawData[`date_${i}`],
          meninas: parseInt(rawData[`meninas_${i}`] || 0),
          meninos: parseInt(rawData[`meninos_${i}`] || 0),
          mocas: parseInt(rawData[`mocas_${i}`] || 0),
          mocos: parseInt(rawData[`mocos_${i}`] || 0),
          total_recitativos: parseInt(rawData[`total_recitativos_${i}`] || 0),
          total_comparecimento: parseInt(rawData[`total_comparecimento_${i}`] || 0),
          municipio: config.municipio,
          comum: config.comum,
          auxiliar_id: user.id,
          auxiliar_email: user.email,
          auxiliar_nome: window.auxiliarFullName || user.user_metadata?.full_name || user.email.split('@')[0]
        });
      });
    } else {
      if (!selectedDateSelect.value) {
        Swal.fire('Aviso', 'Selecione a data do domingo.', 'warning');
        return;
      }
      entries.push({
        data_reuniao: selectedDateSelect.value,
        meninas: parseInt(rawData[`meninas_0`] || 0),
        meninos: parseInt(rawData[`meninos_0`] || 0),
        mocas: parseInt(rawData[`mocas_0`] || 0),
        mocos: parseInt(rawData[`mocos_0`] || 0),
        total_recitativos: parseInt(rawData[`total_recitativos_0`] || 0),
        total_comparecimento: parseInt(rawData[`total_comparecimento_0`] || 0),
        municipio: config.municipio,
        comum: config.comum,
        auxiliar_id: user.id,
        auxiliar_email: user.email,
        auxiliar_nome: window.auxiliarFullName || user.user_metadata?.full_name || user.email.split('@')[0]
      });
    }


    Swal.fire({
      title: 'Enviando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // Enviar cada entrada Separadamente ou em Batch
      // Vou enviar em Batch se o backend suportar, mas o server.js atual espera um por um.
      // Vou ajustar o server.js para aceitar array ou iterar aqui.
      for (const entry of entries) {
        const res = await fetch('/api/recitativos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
        if (!res.ok) throw new Error('Falha no envio de uma das datas');
      }

      Swal.fire('Sucesso!', 'Lançamento realizado com sucesso.', 'success').then(() => {
        window.location.href = '/';
      });
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  });
});
