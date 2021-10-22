import {buildMaze} from './maze.js';
import {drawingSurfaces} from './drawingSurfaces.js';
import {buildRandom} from './random.js';

const random = buildRandom();
const SIZE=30;
// const drawingSurface = drawingSurfaces.canvas({el: document.getElementById('canvas')});
const drawingSurface = drawingSurfaces.svg({el: document.getElementById('svg')});

// const maze = buildMaze({style:'triangle', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random, drawingSurface});
// const maze = buildMaze({style:'square', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random, drawingSurface});
// const maze = buildMaze({style:'hexagon', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random, drawingSurface});
const maze = buildMaze({style:'circle', layers:20, algorithm:'recursiveBacktrack', random, drawingSurface});

// maze.render(svgDrawingSurface);
maze.render();

maze.on(EVENT_CLICK, event => {
    console.log('click', event);
    maze.findDistancesFrom(event.coords);
    maze.render();
});