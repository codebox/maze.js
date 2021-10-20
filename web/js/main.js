import {buildMaze} from './maze.js';
import {drawingSurfaces} from './drawingSurfaces.js';
import {buildRandom} from './random.js';

const random = buildRandom();
const SIZE=30;
const triangleMaze = buildMaze({style:'triangle', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random});
const squareMaze = buildMaze({style:'square', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random});
const hexagonMaze = buildMaze({style:'hexagon', width:3, height:3, algorithm:'recursiveBacktrack', random});
const circularMaze = buildMaze({style:'circle', layers:20, algorithm:'recursiveBacktrack', random});

const maze = hexagonMaze;
const canvasDrawingSurface = drawingSurfaces.canvas(maze, {el: document.getElementById('canvas')});
    // svgDrawingSurface = drawingSurfaces.svg(maze, {el: document.getElementById('svg')});

// maze.render(svgDrawingSurface);
maze.render(canvasDrawingSurface);

maze.on(EVENT_CLICK, event => {
    console.log('click', event);
})