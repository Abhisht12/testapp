const electron = require('electron')
const { BrowserWindow, Tray, Menu, MenuItem } = require('electron')
// Module to control application life.
const app = electron.app

const path = require('path')
const url = require('url')

let mainWindow
let snappyWindow
let movedTimer
let snapInterval
let tray
let allowSnapFeature = false

let currentPositions = { x: 0, y: 0 }

class Snappy {

  constructor(snappyBrowserWindow, snappyElectron) {
    this.snappyBrowserWindow = snappyBrowserWindow
    this.snappyElectron = snappyElectron
    this.x = 0
    this.y = 0
  }

  setSnappyElectron(snapElectron) {
    this.snappyElectron = snapElectron
  }

  getCurrentDisplay() {
    return this.snappyElectron.screen.getDisplayNearestPoint(this.snappyElectron.screen.getCursorScreenPoint())
  }

  getSnappyWindowBounds() {
    return this.snappyBrowserWindow.getBounds()
  }

  setPositions() {
    this.x = this.getSnappyWindowBounds().x
    this.y = this.getSnappyWindowBounds().y
  }

  checkWindowMoved() {
    return (this.x !== this.getSnappyWindowBounds().x || this.y !== this.getSnappyWindowBounds().y) ? true : false
  }

  calculateSnappingPosition() {
    let newPosition = { x: this.snappyBrowserWindow.getBounds().x, y: this.snappyBrowserWindow.getBounds().y }
    let currentDisplay = this.getCurrentDisplay()
    console.log('everywhere')
    console.log(this.getSnappyWindowBounds().width)
    if (allowSnapFeature) {
      if (Math.abs(currentDisplay.workArea.x - newPosition.x) < 100) {
        // snap left
        console.log('there')
        let yPosition = newPosition.y
        // if (!this.isNotOutOfBounds(this.snappyBrowserWindow.getBounds(), currentDisplay.workArea)) {
        //   if (this.snappyBrowserWindow.getBounds().y < currentDisplay.workArea.y){
        //     yPosition = currentDisplay.workArea.y+10;
        //   }
        //   else if((this.snappyBrowserWindow.getBounds().y + this.snappyBrowserWindow.getBounds().height) > (currentDisplay.workArea.y + currentDisplay.workArea.height)){
        //     yPosition = currentDisplay.workArea.y + currentDisplay.workArea.height - (10 + this.snappyBrowserWindow.getBounds().height);
        //   }
        // }
        return { x: currentDisplay.workArea.x + 10, y: yPosition }
      }
      else if (Math.abs(currentDisplay.workArea.x + currentDisplay.workArea.width - (newPosition.x + this.getSnappyWindowBounds().width)) < 100) {
        //snap right
        console.log('here')
        let yPosition = newPosition.y
        // if (!this.isNotOutOfBounds(this.snappyBrowserWindow.getBounds(), currentDisplay.workArea)) {
        //   if (this.snappyBrowserWindow.getBounds().y < currentDisplay.workArea.y){
        //     yPosition = currentDisplay.workArea.y;
        //   }
        //   else if((this.snappyBrowserWindow.getBounds().y + this.snappyBrowserWindow.getBounds().height) > (currentDisplay.workArea.y + currentDisplay.workArea.height)){
        //     yPosition = currentDisplay.workArea.y + currentDisplay.workArea.height - (10 + this.snappyBrowserWindow.getBounds().height);
        //   }
        // }
        return { x: currentDisplay.workArea.x + currentDisplay.workArea.width - (10 + this.getSnappyWindowBounds().width), y: yPosition }
      }
      else if (Math.abs(Math.floor(currentDisplay.workArea.height - (newPosition.y + this.getSnappyWindowBounds().height))) > (Math.abs(currentDisplay.workArea.y - newPosition.y))) {
        // snap up
        return { x: newPosition.x, y: currentDisplay.workArea.y + 10 }
      }
      else {
        //snap down
        return { x: newPosition.x, y: (currentDisplay.workArea.height + (currentDisplay.workArea.y !== 0 ? currentDisplay.workArea.y : 0)) - (this.getSnappyWindowBounds().height + 10) }
      }
    }
    return newPosition
  }

  isNotOutOfBounds(browserBounds, displaybounds) {
    return browserBounds.height > displaybounds.height ? true : false
  }
}

function createSnapshotTray() {
  tray = new Tray(path.join(__dirname, '../www/assets/imgs/logo.png'))
  tray.setToolTip('Snapshot-Dentalxchange')

  const trayMenu = new Menu()
  trayMenu.append(new MenuItem({
    label: 'Dock to Sides', type: 'checkbox', checked: false, click() {
      allowSnapFeature = trayMenu.items[0].checked
    }
  }))
  trayMenu.append(new MenuItem({
    label: 'Always on Top', type: 'checkbox', checked: false, click() {
      mainWindow.setAlwaysOnTop(trayMenu.items[1].checked)
    }
  }))
  trayMenu.append(new MenuItem({ type: 'separator' }))
  trayMenu.append(new MenuItem({ role: 'quit' }))

  tray.setContextMenu(trayMenu)

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
}

function createSnapshotWindow() {

  mainWindow = new BrowserWindow({ width: 500, height: 700 })
  snappyWindow = new Snappy(mainWindow, electron)
  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '../www/index.html'),
    protocol: 'file:',
    // icon: path.join(__dirname, '../www/assets/icon/favicon.ico'),
    slashes: true
  }))

  snappyWindow.setPositions(mainWindow.getBounds())

  // Use an interval to check if the window has moved and set the coordinates as required

  function moveToNewPosition(isResize) {
    if (snappyWindow.checkWindowMoved(mainWindow.getBounds()) || isResize) {
      // Clear out the timer to prevent checking for new positions
      clearTimeout(movedTimer)
      let currentWindowPosition = { x: mainWindow.getBounds().x, y: mainWindow.getBounds().y }
      //get new snappy position
      let newSnappyPosition = snappyWindow.calculateSnappingPosition()
      // set new positions
      if (isSnapRequired(currentWindowPosition, newSnappyPosition)) {
        snapInterval = setInterval(snapWindowFunction, 5)
        function snapWindowFunction() {
          if (isSnapRequired(currentWindowPosition, newSnappyPosition)) {
            if (currentWindowPosition.x !== newSnappyPosition.x) {
              if (currentWindowPosition.x > newSnappyPosition.x)
                mainWindow.setPosition(currentWindowPosition.x--, newSnappyPosition.y)
              else
                mainWindow.setPosition(currentWindowPosition.x++, newSnappyPosition.y)
            }
            else {
              if (currentWindowPosition.y > newSnappyPosition.y)
                mainWindow.setPosition(newSnappyPosition.x, currentWindowPosition.y--)
              else
                mainWindow.setPosition(newSnappyPosition.x, currentWindowPosition.y++)
            }
          }
          else
            clearInterval(snapInterval)
        }
      }
      snappyWindow.setPositions(newSnappyPosition.x, newSnappyPosition.y)
    }
  }

  function isSnapRequired(oldPosition, newPosition) {
    return (oldPosition.x !== newPosition.x || oldPosition.y !== newPosition.y) ? true : false
  }

  mainWindow.on('move', (e, cmd) => {
    console.log('move')
    if (movedTimer !== undefined)
      clearTimeout(movedTimer)
    movedTimer = setTimeout(function () {
      moveToNewPosition(false)
    }, 250)
  })

  mainWindow.on('restore', (e, cmd) => {
    //mainWindow.setPosition(1920, 300)
    //snappyWindow.setSnappyElectron(electron)
  })

  mainWindow.on('maximize', (e, cmd) => {
    if (movedTimer !== undefined)
      clearTimeout(movedTimer)
  })

  mainWindow.on('resize', (e, cmd) => {
    console.log('resize')
    if (movedTimer !== undefined)
      clearTimeout(movedTimer)
    movedTimer = setTimeout(function () {
      console.log('resize here')
      moveToNewPosition(true)
    }, 250)
  })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createSnapshotWindow()
  createSnapshotTray()
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    clearTimeout(movedTimer)
    clearInterval(snapInterval)
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
