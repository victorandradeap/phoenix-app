const state = {
  sourcePath: null,
  targetPath: null,
  pendingFiles: null,
};

const screenSelect = document.getElementById('screen-select');
const screenAnalyze = document.getElementById('screen-analyze');

const sourcePathEl = document.getElementById('source-path');
const targetPathEl = document.getElementById('target-path');
const analyzeSourcePathEl = document.getElementById('analyze-source-path');
const analyzeTargetPathEl = document.getElementById('analyze-target-path');

const btnSelectSource = document.getElementById('btn-select-source');
const btnSelectTarget = document.getElementById('btn-select-target');
const btnAnalyze = document.getElementById('btn-analyze');
const btnCopy = document.getElementById('btn-copy');
const btnBack = document.getElementById('btn-back');
const btnReanalyze = document.getElementById('btn-reanalyze');

const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const tableEl = document.getElementById('files-table');
const tbodyEl = document.getElementById('files-tbody');

const progressWrap = document.getElementById('progress-wrap');
const progressFill = document.getElementById('progress-fill');
const progressTitle = document.getElementById('progress-title');
const progressCount = document.getElementById('progress-count');
const progressCaption = document.getElementById('progress-caption');

const aStep1Circle = document.getElementById('astep1-circle');
const aStep1Label = document.getElementById('astep1-label');
const aConnector1 = document.getElementById('aconnector1');
const aStep2Circle = document.getElementById('astep2-circle');
const aStep2Label = document.getElementById('astep2-label');
const aConnector2 = document.getElementById('aconnector2');
const aStep3Circle = document.getElementById('astep3-circle');
const aStep3Label = document.getElementById('astep3-label');

const CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>';
const FILE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="file-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6"></path></svg>';

function setStatus(message, type) {
  statusEl.textContent = message || '';
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

function showScreen(name) {
  screenSelect.classList.toggle('hidden', name !== 'select');
  screenAnalyze.classList.toggle('hidden', name !== 'analyze');
}

function updateSelectScreenButtons() {
  btnAnalyze.disabled = !(state.sourcePath && state.targetPath);
}

function setStepState(circleEl, labelEl, number, stepState) {
  circleEl.classList.remove('inactive', 'active', 'done');
  circleEl.classList.add(stepState);
  circleEl.innerHTML = stepState === 'done' ? CHECK_ICON : String(number);
  labelEl.classList.toggle('current', stepState !== 'inactive');
}

function setAnalyzeSteps(phase) {
  if (phase === 'analyzing') {
    setStepState(aStep1Circle, aStep1Label, 1, 'done');
    setStepState(aStep2Circle, aStep2Label, 2, 'active');
    setStepState(aStep3Circle, aStep3Label, 3, 'inactive');
    aConnector1.classList.add('done');
    aConnector2.classList.remove('done');
  } else {
    setStepState(aStep1Circle, aStep1Label, 1, 'done');
    setStepState(aStep2Circle, aStep2Label, 2, 'done');
    setStepState(aStep3Circle, aStep3Label, 3, 'active');
    aConnector1.classList.add('done');
    aConnector2.classList.add('done');
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(mtimeMs) {
  return new Date(mtimeMs).toLocaleString('pt-BR');
}

function renderFileList(files) {
  tbodyEl.innerHTML = '';
  for (const file of files) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="file-name">${FILE_ICON}<span>${file.relPath}</span></span></td>
      <td class="col-size">${formatBytes(file.size)}</td>
      <td class="col-date">${formatDate(file.mtimeMs)}</td>
    `;
    tbodyEl.appendChild(tr);
  }
  tableEl.classList.toggle('hidden', files.length === 0);
}

function renderSummary(result) {
  if (result.totalCount === 0) {
    summaryEl.innerHTML = '<div class="empty-state">Nenhum arquivo pendente. O destino já está atualizado.</div>';
    return;
  }

  summaryEl.innerHTML = `
    <div class="stat-tiles">
      <div class="stat-tile">
        <span class="stat-value">${result.totalCount}</span>
        <span class="stat-label">arquivo(s) pendente(s)</span>
      </div>
      <div class="stat-tile">
        <span class="stat-value">${formatBytes(result.totalSize)}</span>
        <span class="stat-label">a copiar</span>
      </div>
      <div class="stat-tile">
        <div class="stat-status-row">${CHECK_ICON}<span class="stat-status-text">Análise concluída</span></div>
        <span class="stat-caption">comparado por hash SHA-256</span>
      </div>
    </div>
  `;
}

function showProgress(title, caption) {
  progressWrap.classList.remove('hidden');
  progressFill.classList.add('indeterminate');
  progressFill.style.width = '';
  progressTitle.textContent = title;
  progressCount.textContent = '';
  progressCaption.textContent = caption;
}

function setProgressDeterminate(done, total, title, countText) {
  progressFill.classList.remove('indeterminate');
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  progressFill.style.width = `${pct}%`;
  progressTitle.textContent = title;
  progressCount.textContent = countText;
}

function hideProgress() {
  progressWrap.classList.add('hidden');
}

btnSelectSource.addEventListener('click', async () => {
  const folder = await window.phoenix.selectFolder();
  if (folder) {
    state.sourcePath = folder;
    sourcePathEl.textContent = folder;
    sourcePathEl.classList.remove('placeholder');
    updateSelectScreenButtons();
  }
});

btnSelectTarget.addEventListener('click', async () => {
  const folder = await window.phoenix.selectFolder();
  if (folder) {
    state.targetPath = folder;
    targetPathEl.textContent = folder;
    targetPathEl.classList.remove('placeholder');
    updateSelectScreenButtons();
  }
});

async function runAnalysis() {
  state.pendingFiles = null;
  btnCopy.disabled = true;
  summaryEl.innerHTML = '';
  tableEl.classList.add('hidden');
  setStatus('Analisando...', null);
  btnAnalyze.disabled = true;
  btnReanalyze.disabled = true;

  setAnalyzeSteps('analyzing');
  showProgress('Escaneando origem...', 'Isso pode levar alguns minutos em pastas grandes — o conteúdo é comparado por hash, não só pelo nome.');

  const stopListening = window.phoenix.onAnalyzeProgress((progress) => {
    if (progress.phase === 'scan') {
      progressCount.textContent = `${progress.count} arquivo(s) encontrado(s)`;
    } else if (progress.phase === 'compare') {
      setProgressDeterminate(
        progress.done,
        progress.total,
        'Verificando conteúdo',
        `${progress.done} / ${progress.total} arquivos`
      );
    }
  });

  try {
    const result = await window.phoenix.analyze(state.sourcePath, state.targetPath);
    state.pendingFiles = result.files;

    renderSummary(result);
    renderFileList(result.files);
    setAnalyzeSteps('results');
    setStatus('Análise concluída.', 'success');
    btnCopy.disabled = result.totalCount === 0;
  } catch (err) {
    setStatus(`Erro ao analisar: ${err.message}`, 'error');
  } finally {
    stopListening();
    hideProgress();
    btnAnalyze.disabled = false;
    btnReanalyze.disabled = false;
  }
}

btnAnalyze.addEventListener('click', () => {
  analyzeSourcePathEl.textContent = state.sourcePath;
  analyzeTargetPathEl.textContent = state.targetPath;
  showScreen('analyze');
  runAnalysis();
});

btnReanalyze.addEventListener('click', () => {
  runAnalysis();
});

btnBack.addEventListener('click', () => {
  state.pendingFiles = null;
  btnCopy.disabled = true;
  summaryEl.innerHTML = '';
  tableEl.classList.add('hidden');
  hideProgress();
  setStatus('', null);
  showScreen('select');
});

btnCopy.addEventListener('click', async () => {
  if (!state.pendingFiles || state.pendingFiles.length === 0) return;

  btnCopy.disabled = true;
  btnReanalyze.disabled = true;
  showProgress('Copiando arquivos', 'Copiando para o destino, preservando a estrutura de pastas.');
  setProgressDeterminate(0, state.pendingFiles.length, 'Copiando arquivos', `0 / ${state.pendingFiles.length}`);
  setStatus('Copiando arquivos...', null);

  const stopListening = window.phoenix.onCopyProgress(({ done, total, currentFile }) => {
    setProgressDeterminate(done, total, 'Copiando arquivos', `${done} / ${total} — ${currentFile}`);
  });

  try {
    const summary = await window.phoenix.copyFiles(
      state.sourcePath,
      state.targetPath,
      state.pendingFiles
    );

    if (summary.failed === 0) {
      setStatus(`Concluído: ${summary.copied} arquivo(s) copiado(s).`, 'success');
    } else {
      const details = summary.errors
        .slice(0, 5)
        .map((e) => `${e.relPath}: ${e.message}`)
        .join(' | ');
      setStatus(
        `Concluído com erros: ${summary.copied} copiado(s), ${summary.failed} falharam. ${details}`,
        'error'
      );
    }

    state.pendingFiles = [];
    summaryEl.innerHTML = '<div class="empty-state">Backup concluído. Clique em "Analisar novamente" para conferir.</div>';
    tableEl.classList.add('hidden');
  } catch (err) {
    setStatus(`Erro ao copiar: ${err.message}`, 'error');
  } finally {
    stopListening();
    hideProgress();
    btnReanalyze.disabled = false;
    btnCopy.disabled = true;
  }
});

updateSelectScreenButtons();
showScreen('select');
