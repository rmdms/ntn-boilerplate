var Nodes = {

  density: 25,

  drawDistance: 24,
  radius: 3,

  points: [],
  mouse: {
    x: -1000,
    y: -1000
  },

  animation: null,

  canvas: null,
  context: null,

  bgImage: null,
  bgCanvas: null,
  bgContext: null,
  bgContextPixelData: null,

  init: function () {
    this.canvas = document.getElementById('canvas');
    this.context = canvas.getContext('2d');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.canvas.addEventListener('mousemove', this.mouseMove, false);
    this.canvas.addEventListener('mousedown', this.mouseDown, false);
    this.canvas.addEventListener('mouseup', this.mouseUp, false);
    this.canvas.addEventListener('mouseout', this.mouseOut, false);

    window.onresize = function (event) {
      Nodes.canvas.width = window.innerWidth;
      Nodes.canvas.height = window.innerHeight;
      Nodes.onWindowResize();
    }

    this.loadData('/images/mmi.png');
  },

  preparePoints: function () {
    this.points = [];

    var i, j, width, height;

    var colors = this.bgContextPixelData.data;

    for (i = 0; i < this.canvas.height; i += this.density) {

      for (j = 0; j < this.canvas.width; j += this.density) {

        var pixelPosition = (j + i * this.bgContextPixelData.width) * 4;

        var color = 'rgba(' + colors[pixelPosition] + ',' + colors[pixelPosition + 1] + ',' + colors[pixelPosition + 2] + ',' + '1)';
        this.points.push({
          x: j,
          y: i,
          originalX: j,
          originalY: i,
          color: color,
          radius: this.radius
        });
      }
    }
  },

  updatePoints: function () {
    var i, currentPoint, theta;

    for (i = 0; i < this.points.length; i++) {

      currentPoint = this.points[i];

      theta = Math.atan2(currentPoint.y - this.mouse.y, currentPoint.x - this.mouse.x);

      currentPoint.x += Math.cos(theta) * -1 + (currentPoint.originalX - currentPoint.x) * 0.05;
      currentPoint.y += Math.sin(theta) * -1 + (currentPoint.originalY - currentPoint.y) * 0.05;
    }
  },

  drawPoints: function () {

    var i, currentPoint;

    for (i = 0; i < this.points.length; i++) {

      currentPoint = this.points[i];

      this.context.fillStyle = currentPoint.color;
      this.context.strokeStyle = currentPoint.color;

      this.context.beginPath();
      this.context.arc(currentPoint.x, currentPoint.y, this.radius, 0, Math.PI * 2, true);
      this.context.closePath();
      this.context.fill();

    }
  },

  draw: function () {
    this.animation = requestAnimationFrame(function () {
      Nodes.draw()
    });

    this.clear();
    this.updatePoints();
    this.drawPoints();
  },

  clear: function () {
    this.canvas.width = this.canvas.width;
  },

  loadData: function (data) {

    this.bgImage = new Image;
    this.bgImage.src = data;

    this.bgImage.onload = function () {
      Nodes.drawImageToBackground();
    }
  },

  drawImageToBackground: function () {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.canvas.width;
    this.bgCanvas.height = this.canvas.height;

    var newWidth, newHeight;

    if (this.bgImage.width > this.bgCanvas.width - 100 || this.bgImage.height > this.bgCanvas.height - 100) {

      var maxRatio = Math.max(this.bgImage.width / (this.bgCanvas.width - 100), this.bgImage.height / (this.bgCanvas.height - 100));
      newWidth = this.bgImage.width / maxRatio;
      newHeight = this.bgImage.height / maxRatio;

    } else {
      newWidth = this.bgImage.width;
      newHeight = this.bgImage.height;
    }

    this.bgContext = this.bgCanvas.getContext('2d');
    this.bgContext.drawImage(this.bgImage, (this.canvas.width - newWidth) / 2, (this.canvas.height - newHeight) / 2, newWidth, newHeight);
    this.bgContextPixelData = this.bgContext.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);

    this.preparePoints();
    this.draw();
  },

  mouseMove: function (event) {
    Nodes.mouse.x = event.offsetX || (event.layerX - Nodes.canvas.offsetLeft);
    Nodes.mouse.y = event.offsetY || (event.layerY - Nodes.canvas.offsetTop);
  },

  mouseOut: function (event) {
    Nodes.mouse.x = -1000;
    Nodes.mouse.y = -1000;
  },

  onWindowResize: function () {
    cancelAnimationFrame(this.animation);
    this.drawImageToBackground();
  }
}

function initialiser() {
  Nodes.init();
}

initialiser();