import {buildMaze} from './maze.js';

const squareMaze = buildMaze({style:'square', width:10, height:10, algorithm:'kruskals'}),
    circularMaze = buildMaze({style:'circle', layers:10, segments:10, algorithm:'prims'}),
    hexagonMaze = buildMaze({style:'hex', width:10, height:10, algorithm:'prims'}),
    triangleMaze = buildMaze({style:'triangle', width:10, height:10, algorithm:'prims'});

console.log(maze);