const express = require('express');
const app = express();
const fs = require('file-system');
const dir = './public/assets/images/gallery';
const $ = require('jQuery');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const chokidar = require('chokidar');
const allowedExtensions = [
  './public/assets/images/gallery/*.jpeg',
  './public/assets/images/gallery/*.jpg',
  './public/assets/images/gallery/*.jpe',
  './public/assets/images/gallery/*.jif',
  './public/assets/images/gallery/*.jfif',
  './public/assets/images/gallery/*.jfi',
  './public/assets/images/gallery/*.png',
  './public/assets/images/gallery/*.gif',
  './public/assets/images/gallery/*.bmp',
  './public/assets/images/gallery/*.svg',
  './public/assets/images/gallery/*.ico',
  './public/assets/images/gallery/*.dib'
]
const watcher = chokidar.watch(allowedExtensions, {
  persistent: true,
  ignoreInitial: true
});
const imagesOnPage = 10;
const port = 80;
let nrOfImages = 0;
let nrOfPages = 0;
let emitSwitched = false;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
})
app.use('/static/', express.static(__dirname + '/public/css/'))
  .use('/gallery/', express.static(__dirname + '/public/assets/images/gallery/'))
  .use('/textures/', express.static(__dirname + '/public/assets/images/textures/'))
  .use('/js/', express.static(__dirname + '/src/scripts/'))

http.listen(port, function() {
  console.log('listening on '+port);
});

let data = {};
let loadImagesData = () => {
  fs.readdir(dir, (err, files) => {
    let imageList = [];
    files.forEach(file => {
      imageList.push(file);
    });

    imageList = imageList.filter(item => (/\....$/g).test(item));
    nrOfImages = imageList.length;
    nrOfPages = Math.ceil(nrOfImages / 10);
    data = {
      imageList: imageList,
      nrOfPages: nrOfPages,
      nrOfImages: nrOfImages
    }
    io.sockets.emit('galleryUpdated', data);
  });
};

let sendGalleryData = (socket) => {
  emitSwitched = false;
  loadImagesData();
  io.on('connection', function(socket) {
    console.log('Users connected: %s', io.engine.clientsCount);
    socket.emit('init', data);
    socket.on('disconnect', function() {
      console.log('User disconnected');
      console.log('Users connected: %s', io.engine.clientsCount);
    });
  });
}

sendGalleryData();

let sendUpdatedData = (data) => {
  io.sockets.emit('galleryUpdated', data);
}

watcher
  .on('add', function(path) {
    let newFile = path.substring(path.lastIndexOf("\\") + 1, path.length);
    let newIndex = data.imageList.length;
    data.imageList[newIndex] = newFile;
    data.nrOfImages = data.imageList.length;
    data.nrOfPages = Math.ceil(data.nrOfImages / 10);
    sendUpdatedData(data);
      console.log('File '+path+' has been changed');
  })
  .on('change', function(path) {
    console.log('File '+path+' has been changed');
    io.sockets.emit('galleryUpdated', data);
  })
  .on('unlink', function(path) {
    let unlinkedFile = path.substring(path.lastIndexOf("\\") + 1, path.length);
    let unlinkedIndex = data.imageList.indexOf(unlinkedFile);
    data.imageList.splice(unlinkedIndex,1);
    data.nrOfImages = data.imageList.length;
    data.nrOfPages = Math.ceil(data.nrOfImages / 10);
    sendUpdatedData(data);
  })
  .on('error', function(error) {
    console.log('error');
    loadImagesData();
  })
