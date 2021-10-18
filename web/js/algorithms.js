import {forEachContiguousPair, shuffleArray} from './utils.js';


function markAsVisited(cell) {
    console.assert(!cell.metadata[METADATA_VISITED]);
    cell.metadata[METADATA_VISITED] = true;
}

function isVisited(cell) {
    return cell.metadata[METADATA_VISITED];
}

function isUnvisited(cell) {
    return !isVisited(cell);
}

function getRandomNeighbour(grid, cell, fnCriteria = () => true) {
    const neighbours = grid.getNeighbours(cell, fnCriteria).toArray();
    if (neighbours.length) {
        return random.choice(neighbours);
    }
}

export const algorithms = {
    'binaryTree': {
        metadata: {}, // description, maskable, unsupported shapes
        fn(grid, config) {
            "use strict";
            console.assert(grid.metadata.shape.pattern === SHAPE_SQUARE);

            const {random} = config;

            grid.forEachCell(cell => {
                 const neighbours = grid.getNeighbours(cell),
                     eastNeighbour = neighbours.getByDirection(DIRECTION_EAST),
                     southNeighbour = neighbours.getByDirection(DIRECTION_SOUTH),
                     goEast = random.int(2) === 0,
                     goSouth = !goEast,
                     linkEast = eastNeighbour && (goEast || !southNeighbour),
                     linkSouth = southNeighbour && (goSouth || !eastNeighbour);

                if (linkEast) {
                    grid.link(cell, eastNeighbour);

                } else if (linkSouth) {
                    grid.link(cell, southNeighbour);
                }
            });
        }
    },
    'sidewinder': {
        metadata: {},
        fn(grid, config) {
            "use strict";
            console.assert(grid.metadata.shape.pattern === SHAPE_SQUARE);

            const {random} = config;

            for (let y = 0; y < grid.metadata.height; y++) {
                let currentRun = [];
                for (let x = 0; x < grid.metadata.width; x++) {
                    const cell = grid.getCellByCoordinates(x, y),
                        neighbours = grid.getNeighbours(cell),
                        eastNeighbour = neighbours.getByDirection(DIRECTION_EAST),
                        southNeighbour = neighbours.getByDirection(DIRECTION_SOUTH),
                        goEast = eastNeighbour && (random.int(2) === 0 || !southNeighbour);

                    if (goEast) {
                        grid.link(cell, eastNeighbour);
                        currentRun.push(cell);

                    } else if (southNeighbour) {
                        const randomCellFromRun = random.choice(currentRun),
                            southNeighbourOfRandomCell = randomCellFromRun.getByDirection(DIRECTION_SOUTH);

                        grid.link(randomCellFromRun, southNeighbourOfRandomCell);

                        currentRun = [];
                    }
                }
            }
        }
    },
    'aldousBroder': {
        metadata: {},
        fn(grid, config) {
            "use strict";
            const {random} = config,
                allCells = grid.getCells();
            let unvisitedCount = allCells.length, currentCell;

            function moveTo(nextCell) {
                if (isUnvisited(nextCell)) {
                    unvisitedCount--;
                    markAsVisited(nextCell);
                    if (currentCell) {
                        grid.link(currentCell, nextCell);
                    }
                }
                currentCell = nextCell;
            }

            const startCell = random.choice(allCells);
            moveTo(startCell);

            while (unvisitedCount) {
                const nextCell = getRandomNeighbour(grid, currentCell);
                moveTo(nextCell);
            }

        }
    },
    'wilson': {
        metadata: {},
        fn(grid, config) {
            "use strict";
            const {random} = config;

            function getRandomUnvisitedCell() {
                const allUnvisitedCells = grid.getCells(isUnvisited);
                if (allUnvisitedCells.length) {
                    return random.choice(allUnvisitedCells);
                }
            }

            function removeLoops(cells) {
                const latestCell = cells[cells.length - 1],
                    indexOfPreviousVisit = cells.findIndex(cell => cell === latestCell);
                if (indexOfPreviousVisit >= 0) {
                    cells.splice(indexOfPreviousVisit + 1);
                }
            }

            markAsVisited(getRandomUnvisitedCell());

            let currentCell;
            while (currentCell = getRandomUnvisitedCell()) {
                let currentPath = [currentCell];

                while (true) {
                    const nextCell = getRandomNeighbour(grid, currentCell);
                    currentPath.push(nextCell);

                    if (isUnvisited(nextCell)) {
                        removeLoops(currentPath);
                        currentCell = nextCell;
                    } else {
                        forEachContiguousPair(currentPath, grid.link);
                        currentPath.forEach(markAsVisited);
                        break;
                    }
                }
            }
        }
    },
    'huntAndKill': {
        metadata: {},
        fn(grid, config) {
            "use strict";
            const {random} = config;

            let currentCell = getRandomUnvisitedCell();
            markAsVisited(currentCell);

            while (true) {
                const nextCell = getRandomNeighbour(grid, currentCell, isUnvisited);
                if (nextCell) {
                    markAsVisited(nextCell);
                    grid.link(currentCell, nextCell);
                    currentCell = nextCell;
                } else {
                    const unvisitedCellsThatHaveVisitedNeighbours = grid.getCells(cell => isUnvisited(cell) && grid.getNeighbours(cell, isVisited).toArray().length);
                    if (unvisitedCellsThatHaveVisitedNeighbours.length) {
                        const newStartCell = random.choice(unvisitedCellsThatHaveVisitedNeighbours),
                            visitedNeighbour = getRandomNeighbour(grid, newStartCell, isVisited);
                        markAsVisited(newStartCell);
                        grid.link(newStartCell, visitedNeighbour);
                        currentCell = newStartCell;
                    } else {
                        break;
                    }
                }
            }
        }
    },
    'recursiveBacktrack': {
        metadata: {},
        fn(grid) {
            "use strict";
            const stack = [];
            let currentCell;

            function visitCell(nextCell) {
                const previousCell = currentCell;
                currentCell = nextCell;
                markAsVisited(currentCell);
                if (previousCell) {
                    grid.link(currentCell, previousCell);
                }
                stack.push(currentCell);
            }

            visitCell(getRandomUnvisitedCell());

            while (stack.length) {
                const nextCell = getRandomNeighbour(grid, currentCell, isUnvisited);
                if (nextCell) {
                    visitCell(nextCell);

                } else {
                    while (!getRandomNeighbour(grid, currentCell, isUnvisited)) {
                        stack.pop();
                        if (!stack.length) {
                            break;
                        }
                        currentCell = stack[stack.length - 1];
                    }
                }
            }
        }
    },
    'kruskals': {
        metadata: {},
        fn(grid) {
            "use strict";
            console.assert(grid.metadata.shape.pattern === SHAPE_SQUARE);

            const links = [],
                connectedSets = {};
            grid.forEachCell(cell => {
                const neighbours = grid.getNeighbours(cell),
                    eastNeighbour = neighbours.getByDirection(DIRECTION_EAST),
                    southNeighbour = neighbours.getByDirection(DIRECTION_SOUTH);

                if (eastNeighbour) {
                    links.push([cell, eastNeighbour]);
                }
                if (southNeighbour) {
                    links.push([cell, southNeighbour]);
                }
                cell.metadata[METADATA_SET_ID] = cell.id;
                connectedSets[cell.id] = [cell];
            });

            shuffleArray(links);

            function mergeSets(id1, id2) {
                connectedSets[id2].forEach(cell => {
                    cell.metadata[METADATA_SET_ID] = id1;
                    connectedSets[id1].push(cell);
                });
                delete connectedSets[id2];
            }

            while (links.length) {
                const [cell1, cell2] = links.pop(),
                    id1 = cell1.metadata[METADATA_SET_ID],
                    id2 = cell2.metadata[METADATA_SET_ID];
                if (id1 !== id2) {
                    grid.link(cell1, cell2);
                    mergeSets(id1, id2);
                }
            }
        }
    }
};



