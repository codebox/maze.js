import {buildSquareGrid, buildTriangularGrid, buildHexagonalGrid, buildCircularGrid} from './maze.js';
import {drawingSurfaces} from './drawingSurfaces.js';
import {buildRandom} from './random.js';
import {algorithms} from './algorithms.js';
import {
    SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE,
    ALGORITHM_NONE, ALGORITHM_BINARY_TREE, ALGORITHM_SIDEWINDER, ALGORITHM_ALDOUS_BRODER, ALGORITHM_WILSON, ALGORITHM_HUNT_AND_KILL, ALGORITHM_RECURSIVE_BACKTRACK, ALGORITHM_KRUSKAL
} from './constants.js';

// const random = buildRandom();
const SIZE=30;
// const drawingSurface1 = drawingSurfaces.canvas({el: document.getElementById('canvas1')});
// const drawingSurface2 = drawingSurfaces.canvas({el: document.getElementById('canvas2')});
// const drawingSurface3 = drawingSurfaces.canvas({el: document.getElementById('canvas3')});
// const drawingSurface4 = drawingSurfaces.canvas({el: document.getElementById('canvas4')});
// // const drawingSurface = drawingSurfaces.svg({el: document.getElementById('svg')});
//
// const maze1 = buildMaze({style:'triangle', width:SIZE*1.5, height:SIZE, algorithm:'recursiveBacktrack', random, drawingSurface: drawingSurface1});
// const maze2 = buildMaze({style:'square', width:SIZE, height:SIZE, algorithm:'recursiveBacktrack', random, drawingSurface: drawingSurface2});
// const maze3 = buildMaze({style:'hexagon', width:15, height:15, algorithm:'recursiveBacktrack', random, drawingSurface: drawingSurface3});
// const maze4 = buildMaze({style:'circle', layers:SIZE, algorithm:'recursiveBacktrack', random, drawingSurface: drawingSurface4});
//
// // maze.findPathBetween([0,0], [10,10]);
// // maze.findPathBetween([0,0], [SIZE-1,0]);
// [maze1, maze2, maze3, maze4].forEach(maze => {
//     // maze.findPathBetween([0,0], [10,10])
//     maze.render();
//
//     maze.on(EVENT_CLICK, event => {
//         console.log('click', event);
//         maze.findDistancesFrom(event.coords);
//         maze.render();
//     });
//
// });

const shapeLookup = {
    [SHAPE_SQUARE]: buildSquareGrid,
    [SHAPE_TRIANGLE]: buildTriangularGrid,
    [SHAPE_HEXAGON]: buildHexagonalGrid,
    [SHAPE_CIRCLE]: buildCircularGrid
};

function validateConfig(config) {
    if (!config) {
        throw new Error('config object missing');
    }

    if (! config.grid) {
        throw new Error('no "grid" property in config object');
    }

    if (! config.grid.cellShape) {
        throw new Error('no "grid.cellShape" property in config object');
    }

    if (![SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE].includes(config.grid.cellShape)) {
        throw new Error('invalid "grid.cellShape" property in config object');
    }

    if ([SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON].includes(config.grid.cellShape)) {
        if (!config.grid.width) {
            throw new Error('missing/invalid "grid.width" property in config object');
        }
        if (!config.grid.height) {
            throw new Error('missing/invalid "grid.height" property in config object');
        }

    } else if (config.grid.cellShape === SHAPE_CIRCLE) {
        if (!config.grid.layers) {
            throw new Error('missing/invalid "grid.layers" property in config object');
        }
    }

    if (![ALGORITHM_NONE, ALGORITHM_BINARY_TREE, ALGORITHM_SIDEWINDER, ALGORITHM_ALDOUS_BRODER, ALGORITHM_WILSON, ALGORITHM_HUNT_AND_KILL, ALGORITHM_RECURSIVE_BACKTRACK, ALGORITHM_KRUSKAL].includes(config.algorithm)) {
        throw new Error('missing/invalid "algorithm" property in config object');
    }

    if (!config.element) {
        throw new Error('missing/invalid "element" property in config object');
    }
    if (!['canvas', 'svg'].includes(config.element.tagName.toLowerCase())) {
        throw new Error('invalid "element" property in config object',config.element.tagName.toLowerCase());
    }
}

export function buildMaze(config) {
    validateConfig(config);

    const random = buildRandom(config.randomSeed || Date.now()),
        grid = shapeLookup[config.grid.cellShape]({
        width: config.grid.width,
        height: config.grid.height,
        layers: config.grid.layers,
        exitConfig: config.exitConfig,
        random,
        drawingSurface: drawingSurfaces[config.element.tagName.toLowerCase()]({
            el: config.element,
            lineWidth: config.lineWidth
        })
    }),
        algorithm = algorithms[config.algorithm];

    grid.initialise();
    (config.mask || []).forEach(maskedCoords => {
        grid.removeCell(maskedCoords);
    });

    const iterator = algorithm.fn(grid, {random});
    grid.runAlgorithm = {
        oneStep() {
            return iterator.next().done && (grid.placeExits() || true);
        },
        toCompletion() {
            while(!iterator.next().done);
            grid.placeExits();
        }
    };

    return grid;
}
