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
          <input type="text" inputmode="numeric" pattern="[0-9]*" name="meninas_${index}" value="0" required class="count-input numeric-input" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Meninos Recitaram</label>
          <input type="text" inputmode="numeric" pattern="[0-9]*" name="meninos_${index}" value="0" required class="count-input numeric-input" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Moças Recitaram</label>
          <input type="text" inputmode="numeric" pattern="[0-9]*" name="mocas_${index}" value="0" required class="count-input numeric-input" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Moços Recitaram</label>
          <input type="text" inputmode="numeric" pattern="[0-9]*" name="mocos_${index}" value="0" required class="count-input numeric-input" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Total de Comparecimento</label>
          <input type="text" inputmode="numeric" pattern="[0-9]*" name="total_comparecimento_${index}" value="0" required class="numeric-input" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Total de Recitativos</label>
          <input type="number" name="total_recitativos_${index}" value="0" readonly style="background: #f8fafc; font-weight: bold; color: var(--brand);">
        </div>
        <div class="form-group" style="grid-column: 1 / -1; margin-top: 8px; text-align: center;">
          <label style="text-align: center;">Total Geral (Comparecimento + Recitativos)</label>
          <input type="number" name="total_geral_${index}" value="0" readonly style="background: #eef2f6; font-weight: bold; color: #1a4d7c; border: 2px solid #cbd5e1; font-size: 16px; text-align: center;">
        </div>
      </div>
      <div class="suspension-row">
        <label class="suspension-toggle">
          <input type="checkbox" name="suspenso_${index}" class="suspension-checkbox">
          <span>Justificar falta de reunião de jovens</span>
        </label>
        <div class="justification-area hidden">
          <label style="font-size: 11px; margin-bottom: 4px; display: block; color: var(--muted); text-transform: uppercase; font-weight: 700;">Motivo do Cancelamento:</label>
          <select name="justificativa_pre_${index}" class="justification-select">
            <option value="">-- Selecione o motivo --</option>
            <option value="Reforma">Reforma</option>
            <option value="Culto de Mocidade">Culto de Mocidade</option>
            <option value="Evento Regional">Evento Regional</option>
            <option value="Outros">Outros</option>
          </select>
          <input type="text" name="justificativa_custom_${index}" class="form-control other-justification hidden" placeholder="Descreva o motivo..." style="margin-top: 8px;">
        </div>
      </div>
    `;

    // Adicionar listener para cálculo automático e UX de limpar o zero
    const countInputs = card.querySelectorAll('.count-input');
    const comparecimentoInput = card.querySelector(`input[name="total_comparecimento_${index}"]`);
    const allNumberInputsNodeList = card.querySelectorAll('.numeric-input');
    
    const totalField = card.querySelector(`input[name="total_recitativos_${index}"]`);
    const totalGeralField = card.querySelector(`input[name="total_geral_${index}"]`);
    const suspensionCheckbox = card.querySelector(`.suspension-checkbox`);
    const justificationArea = card.querySelector(`.justification-area`);
    const justificationSelect = card.querySelector(`.justification-select`);
    const justificationCustom = card.querySelector(`.other-justification`);
    
    // Lógica de Suspensão/Justificativa
    suspensionCheckbox.addEventListener('change', (e) => {
      const isSuspended = e.target.checked;
      card.classList.toggle('suspension-active', isSuspended);
      justificationArea.classList.toggle('hidden', !isSuspended);
      
      const inputsToToggle = [...countInputs, comparecimentoInput];
      inputsToToggle.forEach(input => {
        input.disabled = isSuspended;
        if (isSuspended) {
          input.value = "0";
          input.dispatchEvent(new Event('input'));
        }
      });
      justificationSelect.required = isSuspended;
    });

    justificationSelect.addEventListener('change', (e) => {
      const isOther = e.target.value === 'Outros';
      justificationCustom.classList.toggle('hidden', !isOther);
      justificationCustom.required = isOther;
    });

    const getNumericValue = (input) => {
      const digits = String(input.value || '').replace(/\D/g, '');
      return digits ? parseInt(digits, 10) : 0;
    };

    const sanitizeNumericInput = (input) => {
      const digits = String(input.value || '').replace(/\D/g, '');
      if (input.value !== digits) input.value = digits;
      return digits;
    };

    allNumberInputsNodeList.forEach(input => {
      // Limpar o zero ao focar
      input.addEventListener('focus', () => {
        if (input.value === "0") input.value = "";
      });

      // Voltar para zero se vazio ao desfocar
      input.addEventListener('blur', () => {
        if (input.value === "") {
          input.value = "0";
          input.dispatchEvent(new Event('input'));
        }
      });

      input.addEventListener('input', () => {
        sanitizeNumericInput(input);

        // Calcular Recitativos
        let sumRec = 0;
        countInputs.forEach(i => sumRec += getNumericValue(i));
        totalField.value = sumRec;

        // Calcular Total Geral
        const comp = getNumericValue(comparecimentoInput);
        totalGeralField.value = sumRec + comp;
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
    const parseCount = (value) => {
      const digits = String(value || '').replace(/\D/g, '');
      return digits ? parseInt(digits, 10) : 0;
    };
    
    // Agrupar lançamentos
    const entries = [];
    if (config.type === 'all') {
      config.sundays.forEach((_, i) => {
        const isSus = rawData[`suspenso_${i}`] === 'on';
        let just = '-';
        if (isSus) {
          const pre = rawData[`justificativa_pre_${i}`];
          just = pre === 'Outros' ? (rawData[`justificativa_custom_${i}`] || 'Outro') : pre;
        }

        entries.push({
          data_reuniao: rawData[`date_${i}`],
          meninas: parseCount(rawData[`meninas_${i}`]),
          meninos: parseCount(rawData[`meninos_${i}`]),
          mocas: parseCount(rawData[`mocas_${i}`]),
          mocos: parseCount(rawData[`mocos_${i}`]),
          total_recitativos: parseCount(rawData[`total_recitativos_${i}`]),
          total_comparecimento: parseCount(rawData[`total_comparecimento_${i}`]),
          suspenso: isSus ? 'Sim' : 'Não',
          justificativa: just,
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
      const isSus = rawData[`suspenso_0`] === 'on';
      let just = '-';
      if (isSus) {
        const pre = rawData[`justificativa_pre_0`];
        just = pre === 'Outros' ? (rawData[`justificativa_custom_0`] || 'Outro') : pre;
      }

      entries.push({
        data_reuniao: selectedDateSelect.value,
        meninas: parseCount(rawData[`meninas_0`]),
        meninos: parseCount(rawData[`meninos_0`]),
        mocas: parseCount(rawData[`mocas_0`]),
        mocos: parseCount(rawData[`mocos_0`]),
        total_recitativos: parseCount(rawData[`total_recitativos_0`]),
        total_comparecimento: parseCount(rawData[`total_comparecimento_0`]),
        suspenso: isSus ? 'Sim' : 'Não',
        justificativa: just,
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
      const res = await fetch('/api/recitativos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries)
      });
      
      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorData = responseData;

        // Tratar Trava de Segurança (Duplicados)
        if (res.status === 409 && errorData.duplicate) {
          const dup = errorData.duplicate;
          const dt = new Date(dup.createdAt);
          const formattedCreated = `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour12: false })}`;

          Swal.fire({
            title: 'Lançamento já recebido!',
            html: `A congregação <b>${dup.comum}</b> já enviou as contagens para o dia <b>${dup.dataReuniao}</b>.<br><br>
                   <small style="color: #666;">(Salvo no sistema em: ${formattedCreated})</small>`,
            icon: 'info',
            timer: 5000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#1a4d7c'
          });
          return;
        }

        throw new Error(errorData.error || 'Falha ao enviar os lançamentos');
      }

      let alertTitle = 'Sucesso!';
      let alertHtml = 'Lançamento realizado com sucesso.';
      let alertIcon = 'success';

      if (responseData.skipped && responseData.skipped.length > 0) {
        const skippedDates = responseData.skipped.map(s => s.duplicate.dataReuniao).join(', ');
        alertTitle = 'Sucesso Parcial';
        alertHtml = `<b>Os domingos novos foram salvos!</b><br><br>
                     <small style="color: #b91c1c;">Atenção: Os dias <b>${skippedDates}</b> foram ignorados pois já constavam no sistema.</small>`;
        alertIcon = 'warning';
      }

      Swal.fire({
        title: alertTitle,
        html: alertHtml,
        icon: alertIcon,
        timer: responseData.skipped && responseData.skipped.length > 0 ? 8000 : 5000,
        timerProgressBar: true,
        showConfirmButton: true,
        confirmButtonText: 'OK',
        confirmButtonColor: '#1a4d7c'
      }).then(() => {
        window.location.href = '/';
      });
    } catch (err) {
      Swal.fire({
        title: 'Atenção',
        html: err.message,
        icon: 'error',
        confirmButtonColor: '#1a4d7c'
      });
    }
  });
});
