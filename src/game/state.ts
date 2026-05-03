// حالة اللعبة القابلة للتغيير - تُشارك بين حلقة اللعبة وواجهة المستخدم
// مصممة لتعمل بأعلى أداء ممكن دون التأثير على سرعة المتصفح

export const gameState = {
  playerPos: { x: 0, y: 0, z: 0 },
  playerAngle: 0,
  health: 100,
  inCar: false,
  carPos: { x: 8, y: 0, z: 0 },
  carAngle: 0,
  showEnterPrompt: false,
  showExitPrompt: false,
};
