// create web audio api context
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var canvas = document.getElementById('canvas');
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var canvasCtx = canvas.getContext('2d');

FREQ_LOW = 200;
FREQ_HIGH = 8000;

function Profile(value) {
  this.current_ = value;
}

Profile.prototype.value = function() {
  return this.current_;
};

function StepProfile(init, duration) {
  this.init_ = init;
  this.start_ = Date.now();
  this.duration_ = duration;
}

StepProfile.prototype.value = function() {
  var elapsed = Date.now() - this.start_;
  return this.init_ * ((this.duration_ - elapsed) / this.duration_);
};

function Player(frequency) {
  this.osltr_ = audioCtx.createOscillator();
  this.osltr_.frequency.value = frequency;
  this.gain_ = audioCtx.createGain();
  this.osltr_.connect(this.gain_);
  this.gain_.connect(audioCtx.destination);
  this.gain_.gain.value = 0;
  this.osltr_.start();
}

Player.prototype.play = function(profile) {
  if (this.interval_) clearInterval(this.interval_);
  this.interval_ = setInterval(function() {
    var val = this.gain_.gain.value = profile.value();
    if (val < 1e-6) {
      clearInterval(this.interval_);
      this.gain_.gain.value = 0;
    }
  }.bind(this), 50);
};

Player.prototype.getFreq = function() {
  return this.osltr_.frequency.value;
};

function Director() {
  this.players_ = [];
  var curFreq = FREQ_LOW;
  while (curFreq < FREQ_HIGH && this.players_.length < 500) {
    this.players_.push(new Player(curFreq));
    curFreq *= 1.01;
  }
}

Director.prototype.play = function(frequency, duration, volume) {
  if (!duration) duration = 1000;
  if (!volume) volume = 1;
  for (var i = 0; i < this.players_.length; i++) {
    var player = this.players_[i];
    player.play(new StepProfile(volume * this.gainForFrequency_(player.getFreq(), frequency), duration));
  }
};

Director.prototype.gainForFrequency_ = function(frequency, haupt) {
  var percent;
  if (frequency > haupt) {
    var end = Math.min(haupt + 1000, FREQ_HIGH);
    percent = (end != haupt) ? (end - frequency) / (end - haupt) : 0;
  } else {
    var start = Math.max(haupt - 1000, FREQ_LOW);
    percent = (haupt != start) ? (frequency - start) / (haupt - start) : 0;
  }
  return 0.1 * percent;
};

function Circle(x, y, rgb, size, duration) {
  this.start_ = Date.now();
  this.x_ = x;
  this.y_ = y;
  this.rgb_ = rgb;
  this.size_ = size;
  this.duration_ = duration === 0 ? 1000 : duration;
};

Circle.prototype.drawInContext = function(ctx) {
  ctx.beginPath();
  var percent = this.getCompletePercent_();
  var radius = this.size_ * percent;
  var opacity = 1.0 - percent;
  ctx.arc(this.x_, this.y_, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = 'rgba(' + this.rgb_ + ', ' + opacity + ')';
  ctx.fill();
  return percent === 1.0;
};

Circle.prototype.getCompletePercent_ = function() {
  var elapsed = Date.now() - this.start_;
  return elapsed > this.duration_ ? 1.0 : elapsed / this.duration_;
};

function Visualizer() {
  this.circles_ = {};
}

Visualizer.prototype.show = function(x, y, duration) {
  function getColor(r, g, b) {
    return r + ', ' + g + ', ' + b;
  }
  function colorFor(x) {
    var g = Math.floor(256 * x / window.innerWidth);
    return getColor(0, g, 256 - g);
  }
  function sizeFor(y) {
    return Math.floor(250 * y / window.innerHeight);
  }
  this.circles_[x + ',' + y] = new Circle(x, y, colorFor(x), sizeFor(y), duration);
  window.requestAnimationFrame(this.render_.bind(this));
};

Visualizer.prototype.render_ = function() {
  clearCanvas();
  for (var key in this.circles_) {
    if (this.circles_[key].drawInContext(canvasCtx)) {
      delete this.circles_[key];
    }
  }
  if (Object.keys(this.circles_).length > 0) {
    window.requestAnimationFrame(this.render_.bind(this));
  }
};

function clearCanvas() {
  canvasCtx.fillStyle = 'black';
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
};

var director = new Director();
var visualizer = new Visualizer();
clearCanvas();

document.onclick = function(e) {
  director.play(FREQ_LOW + (e.clientX / window.innerWidth) * (FREQ_HIGH - FREQ_LOW), 2000, e.clientY / window.innerHeight);
  visualizer.show(e.clientX, e.clientY, 2000);
};
