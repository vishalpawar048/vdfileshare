const { ipcRenderer } = require('electron')

const selectFileBtn = document.getElementById('selectFileBtn')
const stopBtn = document.getElementById('stopBtn')
const filePathDiv = document.getElementById('filePath')
const shareUrlDiv = document.getElementById('shareUrl')

selectFileBtn.addEventListener('click', () => {
  ipcRenderer.send('select-file')
})

stopBtn.addEventListener('click', () => {
  ipcRenderer.send('stop-server')
})

ipcRenderer.on('file-selected', (event, filePath) => {
  filePathDiv.innerHTML = `<div class="info-section"><div class="label">Folder Path</div>${filePath}</div>`
})

ipcRenderer.on('file-sharing', (event, url) => {
  stopBtn.style.display = 'block'
  shareUrlDiv.innerHTML = `<div class="info-section"><div class="label"><span class="status-indicator"></span>Sharing Active</div><div class="label">Share URL</div><a href="#" id="shareLink" data-url="${url}">${url}</a></div>`
  
  const shareLink = document.getElementById('shareLink')
  if (shareLink) {
    shareLink.addEventListener('click', (e) => {
      e.preventDefault()
      ipcRenderer.send('open-url', url)
    })
  }
})

ipcRenderer.on('server-stopped', () => {
  stopBtn.style.display = 'none'
  shareUrlDiv.innerHTML = ''
  filePathDiv.innerHTML = ''
})

ipcRenderer.on('file-error', (event, error) => {
  shareUrlDiv.innerHTML = `<div class="info-section" style="border-left-color: #f5576c;"><div style="color: #f5576c;">Error: ${error}</div></div>`
})

