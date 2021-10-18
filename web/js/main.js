import {buildMaze} from './maze.js';
import {renderers} from './renderers.js';
import {buildRandom} from './random.js';

const squareMaze = buildMaze({style:'square', width:10, height:10, algorithm:'binaryTree', random: buildRandom()});

renderers.canvas(squareMaze, {el: document.getElementById('canvas')});

