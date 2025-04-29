// HTMLのCanvas要素を取得
const canvas = document.getElementById('gameCanvas');
// 2D描画のためのコンテキストを取得
const ctx = canvas.getContext('2d');

// キャンバスのサイズを定数に保存
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// プレイヤーのサイズ（正方形の一辺の長さ） - 棒人間なので使いませんが、サイズに影響を与える部分
const playerSize = 40;
// 弾のスピード（1フレームあたりの移動量）
const bulletSpeed = 5;
// 各プレイヤーの最大HP（ライフ）
const maxHits = 3;

// 背景画像を読み込む
const background = new Image();
background.src = 'haikei.png';  // 'haikei.png'を背景画像として読み込む

// プレイヤークラス
class Player {
  constructor(x, color, controls) {
    this.x = x;                        // x座標の初期位置
    this.y = HEIGHT / 2;               // y座標の初期位置（画面中央）
    this.color = color;                // プレイヤーの色
    this.dir = { x: 1, y: 0 };         // 弾を撃つ初期方向（右向き）
    this.hp = maxHits;                 // HPの初期値
    this.isBlocking = false;           // ブロック中かどうか
    this.controls = controls;          // 操作キーの設定
    this.blockStartTime = null;        // ブロック開始時刻（ガード長押し制御用）
  }

  // プレイヤーを描画する（棒人間風）
  draw() {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    // 棒人間のパーツサイズ
    const headRadius = 8;
    const bodyLength = 20;
    const armLength = 15;
    const legLength = 15;

    // 頭の中心座標
    const headX = this.x;
    const headY = this.y - bodyLength - headRadius;

    // 頭（円）
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 胴体（縦線）
    ctx.beginPath();
    ctx.moveTo(this.x, headY + headRadius);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // 腕（左右に伸びた横線）
    ctx.beginPath();
    ctx.moveTo(this.x - armLength, this.y - bodyLength / 2);
    ctx.lineTo(this.x + armLength, this.y - bodyLength / 2);
    ctx.stroke();

    // 左足（斜め線）
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - legLength, this.y + legLength);
    ctx.stroke();

    // 右足（斜め線）
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + legLength, this.y + legLength);
    ctx.stroke();

    // ブロック中の視覚効果（青い円形のオーラ）
    if (this.isBlocking) {
      ctx.strokeStyle = 'cyan';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, headY, headRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // プレイヤーの移動処理
  move(dx, dy) {
    this.x += dx * 5;
    this.y += dy * 5;

    // 進行方向を更新（弾を撃つ向きに使う）
    if (dx !== 0 || dy !== 0) {
      this.dir = { x: dx, y: dy };
    }

    // 画面外に出ないように制限
    this.x = Math.max(playerSize / 2, Math.min(WIDTH - playerSize / 2, this.x));
    this.y = Math.max(playerSize / 2, Math.min(HEIGHT - playerSize / 2, this.y));
  }
}

// 弾のクラス
class Bullet {
  constructor(x, y, dir, owner) {
    this.x = x;             // 弾のx位置
    this.y = y;             // 弾のy位置
    this.dir = dir;         // 弾の方向ベクトル
    this.owner = owner;     // 弾を撃ったプレイヤー
  }

  // 弾の移動
  update() {
    this.x += this.dir.x * bulletSpeed;
    this.y += this.dir.y * bulletSpeed;
  }

  // 弾を描画
  draw() {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2); // 半径5の円
    ctx.fill();
  }

  // 弾が画面外に出たかどうか
  isOut() {
    return this.x < 0 || this.x > WIDTH || this.y < 0 || this.y > HEIGHT;
  }
}

// プレイヤーAとBを作成（初期位置・色・キー設定）
// プレイヤーAは人間操作、プレイヤーBはCPU
const playerA = new Player(100, '#7FFF00', {
  up: 'w', down: 's', left: 'a', right: 'd', shoot: 'f', block: 'g'
});

// プレイヤーBはCPU、AIで動作
const playerB = new Player(WIDTH - 100, 'yellow', {
  up: null, down: null, left: null, right: null, shoot: null, block: null
});

// 弾を格納する配列
let bullets = [];
// キー入力状態を管理するオブジェクト
let keys = {};

// キーが押されたとき
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

// キーが離されたとき
document.addEventListener('keyup', (e) => {
  keys[e.key] = false;

  // ガードキーが離されたとき、ガード解除
  if (e.key === playerA.controls.block) {
    playerA.isBlocking = false;
    playerA.blockStartTime = null;
  }
});

// 入力処理（プレイヤーAは人間操作）
function handleInput(player, controls) {
  let dx = 0, dy = 0;

  // プレイヤーAの移動処理
  if (keys[controls.up]) dy = -1;
  if (keys[controls.down]) dy = 1;
  if (keys[controls.left]) dx = -1;
  if (keys[controls.right]) dx = 1;

  // プレイヤーAを移動させる
  player.move(dx, dy);

  // 弾発射処理（キーが押されていれば弾を撃つ）
  if (keys[controls.shoot]) {
    keys[controls.shoot] = false; // 押しっぱなしによる連射を防ぐ
    bullets.push(new Bullet(player.x, player.y, { ...player.dir }, player));
  }

  // ブロック処理
  if (keys[controls.block]) {
    // まだブロックしていない場合のみ実行
    if (!player.isBlocking) {
      player.isBlocking = true;
      player.blockStartTime = Date.now(); // 現在の時間を記録
    }
  }
}

// プレイヤーBのAI処理（より賢く、滑らかに動くように改善）
function handleAI(player) {
  let dx = 0, dy = 0;

  // プレイヤーAの弾が近づいてきた場合、避けるまたはガードする
  let avoidBullet = false;
  let blockChance = 0.5;  // ガードする確率
  bullets.forEach(bullet => {
    if (bullet.owner !== player) {
      const distanceX = Math.abs(bullet.x - player.x);
      const distanceY = Math.abs(bullet.y - player.y);
      
      if (distanceX < 100 && distanceY < 100) {
        // 弾が近づいてきたら避ける
        if (bullet.x < player.x) dx = 1; // 弾が左に来ている場合、右に避ける
        else dx = -1; // 弾が右に来ている場合、左に避ける
        
        if (bullet.y < player.y) dy = 1; // 弾が上に来ている場合、下に避ける
        else dy = -1; // 弾が下に来ている場合、上に避ける

        // 弾がかなり近い場合にガードを使う
        if (distanceX < 50 && distanceY < 50 && Math.random() < blockChance) {
          player.isBlocking = true;
          player.blockStartTime = Date.now();
        }

        avoidBullet = true;
      }
    }
  });

  // 弾を避ける動きをしない場合、ランダムに動く
  if (!avoidBullet) {
    // 少し滑らかな動きにするため、ランダムな動きの頻度を減らす
    if (Math.random() < 0.1) {
      dx = Math.random() > 0.5 ? 1 : -1;
      dy = Math.random() > 0.5 ? 1 : -1;
    }
  }

  // プレイヤーBを動かす
  player.move(dx, dy);

  // 相手に向かって弾を撃つ
  const angleToA = Math.atan2(playerA.y - player.y, playerA.x - player.x);
  const shootChance = Math.random();

  // プレイヤーAが近くにいる場合、弾を撃つ確率を上げる
  if (Math.abs(playerA.x - player.x) < 300 && Math.abs(playerA.y - player.y) < 300 && shootChance > 0.9) {
    bullets.push(new Bullet(player.x, player.y, {
      x: Math.cos(angleToA), // プレイヤーAに向かって進む
      y: Math.sin(angleToA)
    }, player));
  }
}


// プレイヤーBのブロック状態管理
function updateBlocking(player) {
  // ブロック持続時間の上限（ミリ秒）
  const blockDuration = 200; // ガードの最大持続時間
  if (player.isBlocking && Date.now() - player.blockStartTime > blockDuration) {
    // ブロックが一定時間を超えたら解除
    player.isBlocking = false;
    player.blockStartTime = null;
  }
}



// 弾がプレイヤーに当たったか判定
function checkCollision(bullet, player) {
  // プレイヤーの頭部の当たり判定（円形）
  const headRadius = 8; // 頭の半径
  const headX = player.x;
  const headY = player.y - 20 - headRadius; // 頭部の中心座標（y座標調整）

  // プレイヤーの頭部と弾が衝突しているか
  const distX = bullet.x - headX;
  const distY = bullet.y - headY;
  const distanceToHead = Math.sqrt(distX * distX + distY * distY);

  if (distanceToHead < headRadius + 5) { // 弾の半径5を加味
    return true;
  }

  // 体部分の当たり判定（元々の四角形としての当たり判定）
  return Math.abs(bullet.x - player.x) < playerSize / 2 &&
         Math.abs(bullet.y - player.y) < playerSize / 2;
}

// ゲームの状態更新
function update() {
  // プレイヤーAの入力処理
  handleInput(playerA, playerA.controls);

  // プレイヤーBのAIによる動き
  handleAI(playerB);

  // ブロック持続時間の上限（ミリ秒）
  const blockDuration = 100;

  // 各プレイヤーのブロック持続時間をチェック
  [playerA, playerB].forEach(player => {
    if (player.isBlocking && Date.now() - player.blockStartTime > blockDuration) {
      // ブロック開始から一定時間経過で解除
      player.isBlocking = false;
      player.blockStartTime = null;
    }
  });

  // 弾の移動と当たり判定処理
  bullets.forEach((b, i) => {
    b.update(); // 弾を移動させる
    const opponent = b.owner === playerA ? playerB : playerA;

    // 相手に命中した場合
    if (checkCollision(b, opponent)) {
      if (opponent.isBlocking) {
        // ブロック中なら弾を反射
        b.dir.x *= -1;
        b.dir.y *= -1;
        b.owner = opponent;
      } else {
        // 被弾：HPを1減らす、弾は削除
        opponent.hp--;
        bullets.splice(i, 1);
      }
    } else if (checkCollision(b, b.owner)) {
      // 自分に当たっても無視
    } else if (b.isOut()) {
      // 画面外に出たら弾を削除
      bullets.splice(i, 1);
    }
  });
}

// ゲーム画面の描画
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT); // 画面をクリア

  // 背景を描画（画像がロードされるまで待つ）
  if (background.complete) {
    ctx.drawImage(background, 0, 0, WIDTH, HEIGHT); // 画面全体に背景画像を描画
  }

  // プレイヤーと弾を描画
  playerA.draw();
  playerB.draw();
  bullets.forEach(b => b.draw());

  // HP表示
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Player A HP: ${playerA.hp}`, 20, 20);
  ctx.fillText(`Player B HP: ${playerB.hp}`, WIDTH - 140, 20);

  // 操作説明の表示
  ctx.fillStyle = "lightgray";
  ctx.font = "14px sans-serif";
  ctx.fillText("Player A: W/A/S/D = Move, F = Shoot, G = Block", 20, HEIGHT - 40);
}

// ゲームループ：ゲームの進行を制御
function gameLoop() {
  // 勝敗チェック
  if (playerA.hp <= 0 || playerB.hp <= 0) {
    ctx.fillStyle = "yellow";
    ctx.font = "30px sans-serif";
    const winner = playerA.hp > 0 ? "Player A" : "Player B";
    ctx.fillText(`${winner} Wins!`, WIDTH / 2 - 100, HEIGHT / 2);
    return;
  }

  update();        // 状態の更新（ロジック）
  draw();          // 画面の描画
  requestAnimationFrame(gameLoop); // 次のフレームを呼び出す
}

// ゲームスタート
gameLoop();
