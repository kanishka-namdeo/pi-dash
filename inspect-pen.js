const fs = require('fs');
const data = JSON.parse(fs.readFileSync('D:/test_misc/pi-dash/design/pidash-ui.pen', 'utf8'));
console.log('Top keys:', Object.keys(data));
console.log('Children count:', data.children ? data.children.length : 'no children');
if (data.children) {
  data.children.forEach((c, i) => {
    console.log('Child', i, 'type:', c.type, 'name:', c.name, 'x:', c.x, 'y:', c.y);
    if (c.children) {
      c.children.forEach((cc, j) => {
        if (cc.type === 'frame') {
          console.log('  Sub-frame', j, 'name:', cc.name, 'x:', cc.x, 'y:', cc.y);
        }
      });
    }
  });
}
