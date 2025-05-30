// WebGL Helper Functions (Largely Unchanged)
function initWebGL(canvas, clearColor = [0.95, 0.95, 0.95, 1.0]) { 
    const localGl = canvas.getContext('webgl');
    if (!localGl) { console.error("WebGL not supported on canvas:", canvas.id); canvas.parentElement.innerHTML = `<p class='text-red-500 text-center'>WebGL not supported for ${canvas.id}.</p>`; return null; }
    localGl.viewport(0, 0, canvas.width, canvas.height);
    localGl.clearColor(...clearColor);
    return localGl;
 }
function createShader(currentGl, type, source) { const s = currentGl.createShader(type); currentGl.shaderSource(s, source); currentGl.compileShader(s); if (!currentGl.getShaderParameter(s, currentGl.COMPILE_STATUS)) { console.error('Error compiling shader:', currentGl.getShaderInfoLog(s)); currentGl.deleteShader(s); return null; } return s; }
function createProgram(currentGl, vertexShader, fragmentShader) { const p = currentGl.createProgram(); currentGl.attachShader(p, vertexShader); currentGl.attachShader(p, fragmentShader); currentGl.linkProgram(p); if (!currentGl.getProgramParameter(p, currentGl.LINK_STATUS)) { console.error('Error linking program:', currentGl.getProgramInfoLog(p)); currentGl.deleteProgram(p); return null; } return p; }
const vsSource = `attribute vec2 aVertexPosition; uniform vec2 uResolution; uniform vec2 uTranslation; uniform float uPointSize; void main() { vec2 translatedPosition = aVertexPosition + uTranslation; vec2 zeroToOne = translatedPosition / uResolution; vec2 zeroToTwo = zeroToOne * 2.0; vec2 clipSpace = zeroToTwo - 1.0; gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); gl_PointSize = uPointSize; }`;
const fsSource = `precision mediump float; uniform vec4 uColor; void main() { gl_FragColor = uColor; }`;
const shaderPrograms = new Map();
function getShaderProgram(currentGl) {
    if (shaderPrograms.has(currentGl)) return shaderPrograms.get(currentGl);
    const vertexShader = createShader(currentGl, currentGl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(currentGl, currentGl.FRAGMENT_SHADER, fsSource);
    const newProgram = createProgram(currentGl, vertexShader, fragmentShader);
    if (newProgram) {
        newProgram.vertexPositionAttribute = currentGl.getAttribLocation(newProgram, "aVertexPosition");
        newProgram.resolutionUniform = currentGl.getUniformLocation(newProgram, "uResolution");
        newProgram.translationUniform = currentGl.getUniformLocation(newProgram, "uTranslation");
        newProgram.pointSizeUniform = currentGl.getUniformLocation(newProgram, "uPointSize");
        newProgram.colorUniform = currentGl.getUniformLocation(newProgram, "uColor");
        shaderPrograms.set(currentGl, newProgram);
    }
    return newProgram;
}
function drawPoints(currentGl, pointsData, translation = [0,0]) {
    const sp = getShaderProgram(currentGl);
    if (!currentGl || !sp || !pointsData.color) { console.error("drawPoints: Missing GL, shader program, or pointsData.color", pointsData); return; }
    currentGl.useProgram(sp); currentGl.enableVertexAttribArray(sp.vertexPositionAttribute);
    currentGl.uniform2f(sp.resolutionUniform, currentGl.canvas.width, currentGl.canvas.height);
    currentGl.uniform2fv(sp.translationUniform, translation); currentGl.uniform1f(sp.pointSizeUniform, pointsData.size);
    currentGl.uniform4fv(sp.colorUniform, pointsData.color);
    const buffer = currentGl.createBuffer(); currentGl.bindBuffer(currentGl.ARRAY_BUFFER, buffer);
    currentGl.bufferData(currentGl.ARRAY_BUFFER, new Float32Array(pointsData.points), currentGl.STATIC_DRAW);
    currentGl.vertexAttribPointer(sp.vertexPositionAttribute, 2, currentGl.FLOAT, false, 0, 0);
    currentGl.drawArrays(currentGl.POINTS, 0, pointsData.points.length / 2); currentGl.deleteBuffer(buffer);
}
function drawLines(currentGl, linePoints, color = [0.3,0.3,0.3,1.0], translation = [0,0]) {
    const sp = getShaderProgram(currentGl); if (!currentGl || !sp) return;
    currentGl.useProgram(sp); currentGl.enableVertexAttribArray(sp.vertexPositionAttribute);
    currentGl.uniform2f(sp.resolutionUniform, currentGl.canvas.width, currentGl.canvas.height);
    currentGl.uniform2fv(sp.translationUniform, translation); currentGl.uniform1f(sp.pointSizeUniform, 1.0);
    currentGl.uniform4fv(sp.colorUniform, color);
    const buffer = currentGl.createBuffer(); currentGl.bindBuffer(currentGl.ARRAY_BUFFER, buffer);
    currentGl.bufferData(currentGl.ARRAY_BUFFER, new Float32Array(linePoints), currentGl.STATIC_DRAW);
    currentGl.vertexAttribPointer(sp.vertexPositionAttribute, 2, currentGl.FLOAT, false, 0, 0);
    currentGl.drawArrays(currentGl.LINES, 0, linePoints.length / 2); currentGl.deleteBuffer(buffer);
}
function drawPolygon(currentGl, polyPoints, color = [0.6,0.6,0.9,0.5], translation = [0,0]) { 
    const sp = getShaderProgram(currentGl); if (!currentGl || !sp) return;
    currentGl.useProgram(sp); currentGl.enableVertexAttribArray(sp.vertexPositionAttribute);
    currentGl.uniform2f(sp.resolutionUniform, currentGl.canvas.width, currentGl.canvas.height);
    currentGl.uniform2fv(sp.translationUniform, translation); 
    currentGl.uniform1f(sp.pointSizeUniform, 1.0);
    currentGl.uniform4fv(sp.colorUniform, color);
    const buffer = currentGl.createBuffer(); currentGl.bindBuffer(currentGl.ARRAY_BUFFER, buffer);
    currentGl.bufferData(currentGl.ARRAY_BUFFER, new Float32Array(polyPoints), currentGl.STATIC_DRAW);
    currentGl.vertexAttribPointer(sp.vertexPositionAttribute, 2, currentGl.FLOAT, false, 0, 0);
    currentGl.drawArrays(currentGl.TRIANGLE_FAN, 0, polyPoints.length / 2); currentGl.deleteBuffer(buffer);
}

// --- Learning Center Canvas Drawing Functions (Unchanged) ---
const defaultPointColor = [0.1,0.1,0.8,1];
function drawLatticePointsForLearning(canvasId, pointsData, unitCellLines = [], unitCellFill = []) {
    const canvas = document.getElementById(canvasId); if (!canvas) return;
    const currentGl = initWebGL(canvas); if (!currentGl) return;
    currentGl.clear(currentGl.COLOR_BUFFER_BIT);
    if (unitCellFill.length > 0) drawPolygon(currentGl, unitCellFill, [0.7,0.7,0.95,0.5]);
    if (unitCellLines.length > 0) drawLines(currentGl, unitCellLines, [0.2,0.2,0.7,1.0]);
    const finalPointsData = { ...pointsData }; if (!finalPointsData.color) finalPointsData.color = defaultPointColor;
    drawPoints(currentGl, finalPointsData);
}
function drawTranslationalSymmetry(){const p=[];for(let i=0;i<5;i++)for(let j=0;j<3;j++)p.push(50+i*50,40+j*50);drawLatticePointsForLearning('canvas-translational-symmetry',{points:p,color:[0.1,0.6,0.1,1],size:6});}
function drawSimpleLattice(){const p=[];for(let i=0;i<6;i++)for(let j=0;j<3;j++)p.push(30+i*40,40+j*40);drawLatticePointsForLearning('canvas-simple-lattice',{points:p,color:defaultPointColor,size:5});}
function drawUnitCellExample(){const p=[];for(let i=0;i<5;i++)for(let j=0;j<3;j++)p.push(50+i*50,40+j*50);const ucl=[50,40,100,40,100,40,100,90,100,90,50,90,50,90,50,40];const ucf=[50,40,100,40,100,90,50,90];drawLatticePointsForLearning('canvas-unit-cell',{points:p,size:5,color:defaultPointColor},ucl,ucf);}
function drawPrimitiveVsNonPrimitive(){const c=document.getElementById('canvas-primitive-vs-nonprimitive');const g=initWebGL(c);if(!g)return;g.clear(g.COLOR_BUFFER_BIT);let pl=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++)pl.push(30+i*50,50+j*50);const ull=[30,50,80,50,80,50,80,100,80,100,30,100,30,100,30,50];const ulf=[30,50,80,50,80,100,30,100];g.viewport(0,0,c.width/2,c.height);drawPolygon(g,ulf,[0.7,0.85,0.95,0.5]);drawLines(g,ull);drawPoints(g,{points:pl,color:defaultPointColor,size:5});let pr=[];const ox=200;for(let i=0;i<2;i++)for(let j=0;j<2;j++){pr.push(ox+30+i*60,50+j*50);pr.push(ox+30+i*60+30,50+j*50+25);}const url=[ox+30,50,ox+90,50,ox+90,50,ox+90,100,ox+90,100,ox+30,100,ox+30,100,ox+30,50];const urf=[ox+30,50,ox+90,50,ox+90,100,ox+30,100];g.viewport(c.width/2,0,c.width/2,c.height);const apr=pr.map((v,ix)=>ix%2===0?v-ox:v);const aur=url.map((v,ix)=>ix%2===0?v-ox:v);const aurf=urf.map((v,ix)=>ix%2===0?v-ox:v);drawPolygon(g,aurf,[0.85,0.7,0.95,0.5]);drawLines(g,aur,[0.7,0.2,0.2,1]);drawPoints(g,{points:apr,color:[0.8,0.1,0.1,1],size:5});g.viewport(0,0,c.width,c.height);}
function drawOblique(){const p=[];const a1=[40,0],a2=[20,35];for(let i=0;i<4;i++)for(let j=0;j<3;j++)p.push(40+i*a1[0]+j*a2[0],40+i*a1[1]+j*a2[1]);const uc=[40,40,40+a1[0],40+a1[1],40+a1[0]+a2[0],40+a1[1]+a2[1],40+a2[0],40+a2[1]];const ucl=[uc[0],uc[1],uc[2],uc[3],uc[2],uc[3],uc[4],uc[5],uc[4],uc[5],uc[6],uc[7],uc[6],uc[7],uc[0],uc[1]];drawLatticePointsForLearning('canvas-oblique',{points:p,size:5,color:defaultPointColor},ucl,uc);}
function drawRectangularP(){const p=[];for(let i=0;i<4;i++)for(let j=0;j<3;j++)p.push(40+i*50,40+j*35);const uc=[40,40,90,40,90,75,40,75];const ucl=[40,40,90,40,90,40,90,75,90,75,40,75,40,75,40,40];drawLatticePointsForLearning('canvas-rectangular-p',{points:p,size:5,color:defaultPointColor},ucl,uc);}
function drawRectangularC(){const p=[];const w=50,h=35;for(let i=0;i<3;i++)for(let j=0;j<3;j++){p.push(40+i*w,40+j*h);p.push(40+i*w+w/2,40+j*h+h/2);}const uc=[40,40,40+w,40,40+w,40+h,40,40+h];const ucl=[uc[0],uc[1],uc[2],uc[3],uc[2],uc[3],uc[4],uc[5],uc[4],uc[5],uc[6],uc[7],uc[6],uc[7],uc[0],uc[1]];drawLatticePointsForLearning('canvas-rectangular-c',{points:p,size:5,color:defaultPointColor},ucl,uc);}
function drawSquare(){const p=[];const s=40;for(let i=0;i<3;i++)for(let j=0;j<3;j++)p.push(35+i*s,35+j*s);const uc=[35,35,35+s,35,35+s,35+s,35,35+s];const ucl=[uc[0],uc[1],uc[2],uc[3],uc[2],uc[3],uc[4],uc[5],uc[4],uc[5],uc[6],uc[7],uc[6],uc[7],uc[0],uc[1]];drawLatticePointsForLearning('canvas-square',{points:p,size:5,color:defaultPointColor},ucl,uc);}
function drawHexagonal(){const p=[];const s=40;const ht=s*Math.sqrt(3)/2;const a1=[s,0],a2=[s/2,ht];for(let i=-1;i<3;i++)for(let j=-1;j<3;j++)p.push(50+i*a1[0]+j*a2[0],50+i*a1[1]+j*a2[1]);const p0=[50,50],p1=[p0[0]+a1[0],p0[1]+a1[1]],p2=[p0[0]+a2[0],p0[1]+a2[1]],p3=[p0[0]+a1[0]+a2[0],p0[1]+a1[1]+a2[1]];const uc=[p0[0],p0[1],p1[0],p1[1],p3[0],p3[1],p2[0],p2[1]];const ucl=[p0[0],p0[1],p1[0],p1[1],p1[0],p1[1],p3[0],p3[1],p3[0],p3[1],p2[0],p2[1],p2[0],p2[1],p0[0],p0[1]];drawLatticePointsForLearning('canvas-hexagonal',{points:p,size:5,color:defaultPointColor},ucl,uc);}

// --- Game 1: Name That Lattice Logic (Unchanged) ---
const gameCanvas1 = document.getElementById('game-canvas'); const answerButtonsContainer = document.getElementById('answer-buttons'); const feedbackDiv1 = document.getElementById('feedback'); const nextQuestionButton = document.getElementById('next-question'); let gameGL1; let currentLatticeTypeGame1 = '';
const game1LatticeTypes = [ { name: "Oblique", drawFunc: ()=>drawObliqueGame(gameGL1) }, { name: "Rectangular (Primitive)", drawFunc: ()=>drawRectangularPGame(gameGL1) }, { name: "Rectangular (Centered)", drawFunc: ()=>drawRectangularCGame(gameGL1) }, { name: "Square", drawFunc: ()=>drawSquareGame(gameGL1) }, { name: "Hexagonal", drawFunc: ()=>drawHexagonalGame(gameGL1) } ];
function setupGame1Canvas() { gameGL1 = initWebGL(gameCanvas1, [1.0,1.0,1.0,1.0]); if (!gameGL1) return; }
function drawObliqueGame(ctx){const p=[];const a1=[60,0],a2=[30,50];for(let i=0;i<4;i++)for(let j=0;j<3;j++)p.push(50+i*a1[0]+j*a2[0],25+i*a1[1]+j*a2[1]);drawPoints(ctx,{points:p,color:defaultPointColor,size:6});}
function drawRectangularPGame(ctx){const p=[];for(let i=0;i<5;i++)for(let j=0;j<3;j++)p.push(50+i*60,40+j*40);drawPoints(ctx,{points:p,color:defaultPointColor,size:6});}
// ... existing code ... 