import {buildMaze} from './maze.js';
import {drawingSurfaces} from './drawingSurfaces.js';
import {buildRandom} from './random.js';

const random = buildRandom();
const SIZE=10;
const squareMaze = buildMaze({style:'square', width:SIZE, height:SIZE, algorithm:'kruskals', random});
const drawingSurface = drawingSurfaces.canvas(squareMaze, {el: document.getElementById('canvas'), gridWidth: SIZE, gridHeight: SIZE});

squareMaze.render(drawingSurface);

