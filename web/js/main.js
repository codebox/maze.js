import {buildMaze} from './maze.js';
import {drawingSurfaces} from './drawingSurfaces.js';
import {buildRandom} from './random.js';

const random = buildRandom();
const SIZE=10;
const triangleMaze = buildMaze({style:'triangle', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random});
const squareMaze = buildMaze({style:'square', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random});
const hexagonMaze = buildMaze({style:'hexagon', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random});

const maze = triangleMaze;
const drawingSurface = drawingSurfaces.canvas(maze, {el: document.getElementById('canvas')});

maze.render(drawingSurface);

