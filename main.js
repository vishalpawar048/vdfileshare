const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron/main')
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const os = require('os')

let server = null
let currentFolderPath = null
let mainWindow = null

const getLocalNetworkIP = () => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

let serverPort = 3000

const startFileServer = (folderPath, port = 3000) => {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close()
    }

    const expressApp = express()
    expressApp.use(cors())

    // Serve static files from selected folder
    expressApp.use(express.static(folderPath))

    // Enable directory listing
    expressApp.get('*', (req, res, next) => {
      const requestedPath = path.join(folderPath, req.path)

      // Security: ensure the path is within the folder
      const resolvedPath = path.resolve(requestedPath)
      const resolvedFolder = path.resolve(folderPath)

      if (!resolvedPath.startsWith(resolvedFolder)) {
        return res.status(403).send('Access denied')
      }

      fs.stat(requestedPath, (err, stats) => {
        if (err) {
          return res.status(404).send('File not found')
        }

        if (stats.isDirectory()) {
          fs.readdir(requestedPath, (err, files) => {
            if (err) {
              return res.status(500).send('Error reading directory')
            }

            let html = '<html><head><title>Directory Listing</title></head><body><h1>Directory: ' + req.path + '</h1><ul>'
            files.forEach(file => {
              let filePath = path.join(req.path, file).replace(/\\/g, '/')
              // Ensure path starts with /
              if (!filePath.startsWith('/')) {
                filePath = '/' + filePath
              }
              html += '<li><a href="' + filePath + '">' + file + '</a></li>'
            })
            html += '</ul></body></html>'
            res.send(html)
          })
        } else {
          next()
        }
      })
    })

    server = expressApp.listen(port, () => {
      serverPort = port
      const ip = getLocalNetworkIP()
      const url = `http://${ip}:${port}`
      console.log(`Server running at ${url}`)
      resolve(url)
    })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        startFileServer(folderPath, port + 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })
  })
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
}

ipcMain.on('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    currentFolderPath = result.filePaths[0]
    
    mainWindow.webContents.send('file-selected', currentFolderPath)

    try {
      const url = await startFileServer(currentFolderPath)
      mainWindow.webContents.send('file-sharing', url)
    } catch (error) {
      mainWindow.webContents.send('file-error', error.message)
    }
  }
})

ipcMain.on('stop-server', () => {
  if (server) {
    server.close()
    server = null
    currentFolderPath = null
    mainWindow.webContents.send('server-stopped')
  }
})

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url)
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (server) {
    server.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (server) {
    server.close()
  }
})