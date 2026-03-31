// --- CONFIG & ASSETS ---
const LAYER_ORDER = ["base", "socks", "shoes", "pants", "tops", "accessories", "eyebrows", "eyes", "noses", "mouths", "hair", "hands"]; 

const CATEGORIES = {
  base: { label: "Body", items: [{ file: "base.png", label: "1" }] },
  hair: { label: "Hair", items: [{ file: null, label: "None" }, ...Array.from({length: 19}, (_, i) => ({ file: `hair/hair${i+1}.png`, label: `${i+1}` }))] },
  eyes: { label: "Eyes", items: [{ file: null, label: "None" }, ...Array.from({length: 5}, (_, i) => ({ file: `eyes/eye${i+1}.png`, label: `${i+1}` }))] },
  eyebrows: { label: "Brows", items: [{ file: null, label: "None" }, ...Array.from({length: 5}, (_, i) => ({ file: `eyebrows/brow${i+1}.png`, label: `${i+1}` }))] },
  noses: { label: "Nose", items: [{ file: null, label: "None" }, ...Array.from({length: 7}, (_, i) => ({ file: `noses/nose${i+1}.png`, label: `${i+1}` }))] },
  mouths: { label: "Mouth", items: [{ file: null, label: "None" }, ...Array.from({length: 5}, (_, i) => ({ file: `mouths/mouth${i+1}.png`, label: `${i+1}` }))] },
  tops: { label: "Tops", items: [{ file: null, label: "None" }, ...Array.from({length: 22}, (_, i) => ({ file: `tops/top${i+1}.png`, label: `${i+1}` }))] },
  pants: { label: "Bottoms", items: [{ file: null, label: "None" }, ...Array.from({length: 10}, (_, i) => ({ file: `pants/bottom${i+1}.png`, label: `${i+1}` }))] },
  socks: { label: "Socks", items: [{ file: null, label: "None" }, ...Array.from({length: 4}, (_, i) => ({ file: `socks/socks${i+1}.png`, label: `${i+1}` }))] },
  shoes: { label: "Shoes", items: [{ file: null, label: "None" }, ...Array.from({length: 4}, (_, i) => ({ file: `shoes/shoes${i+1}.png`, label: `${i+1}` }))] },
  accessories: { label: "Acc.", items: [{ file: null, label: "None" }, ...Array.from({length: 5}, (_, i) => ({ file: `accessories/acc${i+1}.png`, label: `${i+1}` }))] }
};

const SIDEBAR_ORDER = ["eyes", "eyebrows", "mouths", "noses", "hair", "tops", "pants", "socks", "shoes", "accessories"];
const CW = 750, CH = 1000, TOP_H = 60, BOT_H = 60;
const FACE_ZONE = { x: 700, y: 120, w: 70, h: 70 }, FEET_ZONE = { x: 600, y: 670, w: 200, h: 200 }, BODY_ZONE = { x: 600, y: 200, w: 300, h: 300 }; 

let avatar, activeCat = "eyes", appState = "INTRO", modalState = "NONE", assets = {};
let bgMusic, sfxItem, sfxUI, sfxSidebar, titleImg, secondImg, introDrawing, customFont;
let assetsLoaded = 0, totalAssets = 0;
let canvasScale = 1.0;
let fingerX = -100, fingerY = -100; 

function assetLoaded() { assetsLoaded++; }

class Avatar {
  constructor() { this.reset(); this.bounce = 1.0; }
  reset() { this.selections = {}; for (let k in CATEGORIES) this.selections[k] = 0; this.bounce = 1.05; }
  randomize() { for (let k in CATEGORIES) { this.selections[k] = floor(random(CATEGORIES[k].items.length)); } this.bounce = 1.05; }
  draw(x, y, stageH, isPreview = false, catKey = null) {
    let cropX = 540, visW = 400, origSize = 1000;
    this.bounce = lerp(this.bounce, 1.0, 0.15);
    let s = (stageH / origSize) * (isPreview ? 1.0 : this.bounce);
    let drawW = visW * s;
    push();
    if (isPreview) {
      let zone = ["eyes", "eyebrows", "noses", "mouths", "hair"].includes(catKey) ? FACE_ZONE : (["shoes", "socks"].includes(catKey) ? FEET_ZONE : BODY_ZONE);
      let imgFile = CATEGORIES[catKey].items[1]?.file || CATEGORIES[catKey].items[0].file;
      if (imgFile && assets[imgFile]) image(assets[imgFile], x, y, 40, 40, zone.x, zone.y, zone.w, zone.h);
    } else {
      translate(x + (370 - drawW) / 2, y + (stageH - (stageH * this.bounce))/2);
      for (let layer of LAYER_ORDER) {
        let img = (layer === "hands") ? assets["hands/hands1.png"] : (CATEGORIES[layer] ? assets[CATEGORIES[layer].items[this.selections[layer]].file] : null);
        if (img) image(img, 0, 0, drawW, stageH * this.bounce, cropX, 0, visW, origSize);
      }
    }
    pop();
  }
}

class SketchButton {
  constructor(x, y, w, h, label, isMain = false) { 
    this.x = x; this.y = y; this.w = w; this.h = h; this.label = label; this.isMain = isMain; 
  }
  render() {
    push(); stroke(0); strokeWeight(this.isMain ? 4 : 2); 
    fill(this.isOver() ? 240 : 255);
    randomSeed(this.x + this.y + floor(millis()/150));
    beginShape();
    vertex(this.x + random(-3,3), this.y + random(-3,3));
    vertex(this.x + this.w + random(-3,3), this.y + random(-3,3));
    vertex(this.x + this.w + random(-3,3), this.y + this.h + random(-3,3));
    vertex(this.x + random(-3,3), this.y + this.h + random(-3,3));
    endShape(CLOSE);
    noStroke(); fill(0); textAlign(CENTER, CENTER); 
    if(customFont) textFont(customFont); 
    textSize(this.isMain ? 32 : 18);
    text(this.label, this.x + this.w/2, this.y + this.h/2 + (this.isMain ? 5 : 2)); 
    pop();
  }
  isOver() { return fingerX > this.x && fingerX < this.x + this.w && fingerY > this.y && fingerY < this.y + this.h; }
}

function preload() {
  for (let cat in CATEGORIES) { CATEGORIES[cat].items.forEach(item => { if (item.file) totalAssets++; }); }
  totalAssets += 8; 
  for (let cat in CATEGORIES) { 
    CATEGORIES[cat].items.forEach(item => { if (item.file) assets[item.file] = loadImage(item.file, assetLoaded); }); 
  }
  assets["hands/hands1.png"] = loadImage("hands/hands1.png", assetLoaded);
  titleImg = loadImage("title_logo.png", assetLoaded); 
  secondImg = loadImage("secondImg.png", assetLoaded);
  introDrawing = loadImage("info.png", assetLoaded);
  customFont = loadFont("mieszkanie.otf", assetLoaded); 
  bgMusic = loadSound("song1.mp3", () => { bgMusic.setVolume(0.4); assetLoaded(); });
  sfxItem = loadSound("click_item.mp3", assetLoaded);
  sfxUI = loadSound("click_ui.mp3", assetLoaded); 
  sfxSidebar = loadSound("click_sidebar.mp3", assetLoaded);
}

function setup() {
  // CRITICAL MOBILE FIX: Stop browser touch actions
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.elt.style.touchAction = 'none'; 
  
  updateSize();
  avatar = new Avatar();
}

function updateSize() {
  let targetW = min(windowWidth, CW);
  canvasScale = targetW / CW;
  resizeCanvas(targetW, CH * canvasScale);
}

function windowResized() { updateSize(); }

function draw() {
  background(255);
  if (assetsLoaded < totalAssets) {
    fill(0); textAlign(CENTER, CENTER); text("Loading...", width/2, height/2);
    return;
  }

  scale(canvasScale);
  // Map mouse/touch to game coordinates
  fingerX = mouseX / canvasScale;
  fingerY = mouseY / canvasScale;

  if (appState === "INTRO") drawIntro();
  else if (appState === "HELP") drawHelp();
  else drawGame();

  if (modalState !== "NONE") drawModal();
}

function touchStarted() {
  if (getAudioContext().state !== 'running') getAudioContext().resume();
  triggerAction();
  return false; // Stop scrolling
}

function mousePressed() {
  // Only trigger if not already handled by touch
  if (touches.length === 0) triggerAction();
}

function triggerAction() {
  let aid = getHoverID();
  if (modalState === "RESET_CONFIRM") {
    if (aid === "mod_yes") { avatar.reset(); sfxUI.play(); modalState = "NONE"; }
    else if (aid === "mod_no") { sfxUI.play(); modalState = "NONE"; }
    return;
  }
  if (modalState === "SAVE_DONE") {
    if (aid === "mod_ok") { sfxUI.play(); modalState = "NONE"; }
    return;
  }
  if (appState === "INTRO") {
    if (aid === "start_btn") { sfxUI.play(); appState = "HELP"; if(bgMusic && !bgMusic.isPlaying()) bgMusic.loop(); }
  } else if (appState === "HELP") {
    if (aid === "go_btn") { sfxUI.play(); appState = "GAME"; }
  } else {
    if (aid === "home_btn") { sfxUI.play(); appState = "INTRO"; }
    else if (aid === "help_btn") { sfxUI.play(); appState = "HELP"; }
    else if (aid === "reset_btn") { sfxUI.play(); modalState = "RESET_CONFIRM"; }
    else if (aid === "rand_btn") { sfxUI.play(); avatar.randomize(); }
    else if (aid === "save_btn") { sfxUI.play(); saveCanvas('my_doodle', 'jpg'); modalState = "SAVE_DONE"; }
    else if (fingerX < 100 && fingerY > TOP_H && fingerY < CH-BOT_H) {
      let idx = floor((fingerY - TOP_H) / ((CH-TOP_H-BOT_H)/SIDEBAR_ORDER.length));
      if (SIDEBAR_ORDER[idx]) { sfxSidebar.play(); activeCat = SIDEBAR_ORDER[idx]; }
    }
    else if (fingerX > 100 && fingerX < 380 && fingerY > TOP_H && fingerY < CH-BOT_H) {
      let col = floor((fingerX-115)/85), row = floor((fingerY-(TOP_H+30))/85); 
      let idx = col + row * 3;
      if (CATEGORIES[activeCat]?.items[idx]) { sfxItem.play(); avatar.selections[activeCat] = idx; avatar.bounce = 1.05; }
    }
  }
}

function getHoverID() {
  if (modalState === "RESET_CONFIRM") {
    if (over(CW/2-110, CH/2+20, 100, 40)) return "mod_yes";
    if (over(CW/2+10, CH/2+20, 100, 40)) return "mod_no";
  }
  if (modalState === "SAVE_DONE") { if (over(CW/2-50, CH/2+20, 100, 40)) return "mod_ok"; }
  if (appState === "INTRO" && over(CW/2 - 125, CH - 200, 250, 80)) return "start_btn";
  if (appState === "HELP" && over(CW/2-60, CH - 150, 120, 60)) return "go_btn";
  if (appState === "GAME") {
    if (over(10, 10, 40, 40)) return "home_btn";
    if (over(60, 10, 40, 40)) return "help_btn";
    if (over(10, CH-50, 90, 40)) return "reset_btn";
    if (over(110, CH-50, 90, 40)) return "rand_btn";
    if (over(CW-100, CH-50, 90, 40)) return "save_btn";
  }
  return null;
}

function over(x, y, w, h) { return fingerX > x && fingerX < x + w && fingerY > y && fingerY < y + h; }

// --- DRAWING FUNCTIONS ---
function drawIntro() {
  push(); drawStaticBox(50, 50, CW-100, CH-100); imageMode(CENTER);
  if (titleImg) image(titleImg, CW/2, CH/2 - 250, 500, 300); 
  if (introDrawing) image(introDrawing, CW/2, CH/2 + 80, 600, 350);
  new SketchButton(CW/2 - 125, CH - 200, 250, 80, "START!", true).render(); 
  pop();
}

function drawHelp() {
  push(); drawStaticBox(50, 50, CW-100, CH-100); textAlign(CENTER, TOP); fill(0);
  if(customFont) textFont(customFont);
  if (secondImg) image(secondImg, CW/5, 150, 500, 340);
  textSize(28); text("1. Tap items to pick them.", CW/2, 400);
  text("2. Sidebar changes tabs.", CW/2, 460);
  text("3. RANDOM for surprise.", CW/2, 520);
  text("4. SAVE your art!", CW/2, 580);
  new SketchButton(CW/2 - 60, CH - 150, 120, 60, "GO!").render(); pop();
}

function drawGame() {
  drawStaticBox(0, 0, CW, TOP_H); 
  new SketchButton(10, 10, 40, 40, "<-").render(); 
  new SketchButton(60, 10, 40, 40, "?").render();
  
  // Sidebar
  drawStaticBox(0, TOP_H, 100, CH-TOP_H-BOT_H);
  let sH = (CH-TOP_H-BOT_H) / SIDEBAR_ORDER.length;
  SIDEBAR_ORDER.forEach((key, i) => {
    let y = TOP_H + i * sH; 
    if (activeCat === key) { fill(235); noStroke(); rect(5, y+5, 90, sH-10, 5); }
    avatar.draw(30, y+5, 40, true, key); 
    push(); fill(0); noStroke(); textSize(12); textAlign(CENTER);
    textFont("Helvetica"); text(CATEGORIES[key].label, 50, y + sH - 8); pop();
  });
  
  // Grid
  drawStaticBox(100, TOP_H, 280, CH-TOP_H-BOT_H);
  CATEGORIES[activeCat].items.forEach((item, i) => {
    let x = 115 + (i%3)*85, y = TOP_H + 30 + floor(i/3)*85; 
    stroke(0); fill(avatar.selections[activeCat] === i ? 220 : 255); rect(x, y, 75, 75, 5);
    if (item.file) { 
      let z = ["eyes","eyebrows","noses","mouths","hair"].includes(activeCat)?FACE_ZONE:(["shoes","socks"].includes(activeCat)?FEET_ZONE:BODY_ZONE); 
      image(assets[item.file], x+5, y+5, 65, 65, z.x, z.y, z.w, z.h); 
    } else if (i === 0) { line(x+20, y+20, x+55, y+55); line(x+55, y+20, x+20, y+55); }
  });
  
  drawStaticBox(380, TOP_H, 370, CH-TOP_H-BOT_H); 
  avatar.draw(380, TOP_H + 20, 850);
  
  drawStaticBox(0, CH-BOT_H, CW, BOT_H); 
  new SketchButton(10, CH-50, 90, 40, "RESET").render(); 
  new SketchButton(110, CH-50, 90, 40, "RANDOM").render(); 
  new SketchButton(CW-100, CH-50, 90, 40, "SAVE").render();
}

function drawModal() {
  push(); scale(1); fill(255, 230); noStroke(); rect(0, 0, CW, CH);
  drawStaticBox(CW/2-150, CH/2-100, 300, 200);
  fill(0); textAlign(CENTER, CENTER); if(customFont) textFont(customFont); textSize(26);
  if (modalState === "RESET_CONFIRM") {
    text("Are you sure?", CW/2, CH/2 - 40);
    new SketchButton(CW/2-110, CH/2+20, 100, 40, "YES").render();
    new SketchButton(CW/2+10, CH/2+20, 100, 40, "NO").render();
  } else if (modalState === "SAVE_DONE") {
    text("Saved!", CW/2, CH/2 - 40);
    new SketchButton(CW/2-50, CH/2+20, 100, 40, "OK").render();
  }
  pop();
}

function drawStaticBox(x, y, w, h) {
  push(); noFill(); stroke(0); strokeWeight(2); randomSeed(x + y + floor(millis()/150));
  for(let j=0; j<2; j++) { 
    beginShape(); vertex(x+random(-2,2), y+random(-2,2)); 
    vertex(x+w+random(-2,2), y+random(-2,2)); 
    vertex(x+w+random(-2,2), y+h+random(-2,2)); 
    vertex(x+random(-2,2), y+h+random(-2,2)); 
    endShape(CLOSE); 
  } 
  pop();
}