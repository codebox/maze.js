import {forEachContiguousPair} from './utils.js';


function markAsVisited(cell) {
    cell.metadata[METADATA_VISITED] = true;
}

function isVisited(cell) {
    return cell.metadata[METADATA_VISITED];
}

function isUnvisited(cell) {
    return !isVisited(cell);
}

export const algorithms = {
    'binaryTree': {
        metadata: {}, // description, maskable, unsupported shapes
        fn(grid, config) {
            "use strict";
            console.assert(grid.isSquare);

            const {random} = config;

            grid.forEachCell(cell => {
                 const
                     eastNeighbour = cell.neighbours[DIRECTION_EAST],
                     southNeighbour = cell.neighbours[DIRECTION_SOUTH],
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
            console.assert(grid.isSquare);

            const {random} = config;

            for (let y = 0; y < grid.metadata.height; y++) {
                let currentRun = [];
                for (let x = 0; x < grid.metadata.width; x++) {
                    const cell = grid.getCellByCoordinates(x, y),
                        eastNeighbour = cell.neighbours[DIRECTION_EAST],
                        southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                        goEast = eastNeighbour && (random.int(2) === 0 || !southNeighbour);

                    currentRun.push(cell);
                    if (goEast) {
                        grid.link(cell, eastNeighbour);

                    } else if (southNeighbour) {
                        const randomCellFromRun = random.choice(currentRun),
                            southNeighbourOfRandomCell = randomCellFromRun.neighbours[DIRECTION_SOUTH];

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
            const {random} = config;
            let unvisitedCount = grid.cellCount, currentCell;

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

            const startCell = grid.randomCell();
            moveTo(startCell);

            while (unvisitedCount) {
                const nextCell = currentCell.neighbours.random();
                moveTo(nextCell);
            }

        }
    },
    'wilson': {
        metadata: {},
        fn(grid, config) {
            "use strict";
            const {random} = config;

            function removeLoops(cells) {
                const latestCell = cells[cells.length - 1],
                    indexOfPreviousVisit = cells.findIndex(cell => cell === latestCell);
                if (indexOfPreviousVisit >= 0) {
                    cells.splice(indexOfPreviousVisit + 1);
                }
            }

            markAsVisited(grid.randomCell(isUnvisited));

            let currentCell;
            while (currentCell = grid.randomCell(isUnvisited)) {
                let currentPath = [currentCell];

                while (true) {
                    const nextCell = currentCell.neighbours.random();
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

            let currentCell = grid.randomCell();
            markAsVisited(currentCell);

            while (true) {
                const nextCell = currentCell.neighbours.random(isUnvisited);
                if (nextCell) {
                    markAsVisited(nextCell);
                    grid.link(currentCell, nextCell);
                    currentCell = nextCell;
                } else {
                    const unvisitedCellWithVisitedNeighbours = grid.randomCell(cell => isUnvisited(cell) && cell.neighbours.random(isVisited));
                    if (unvisitedCellWithVisitedNeighbours) {
                        const visitedNeighbour = unvisitedCellWithVisitedNeighbours.neighbours.random(isVisited);
                        markAsVisited(unvisitedCellWithVisitedNeighbours);
                        grid.link(unvisitedCellWithVisitedNeighbours, visitedNeighbour);
                        currentCell = unvisitedCellWithVisitedNeighbours;
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

            visitCell(grid.randomCell());

            while (stack.length) {
                const nextCell = currentCell.neighbours.random(isUnvisited);
                if (nextCell) {
                    visitCell(nextCell);

                } else {
                    while (!currentCell.neighbours.random(isUnvisited)) {
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
        fn(grid, config) {
            "use strict";
            const {random} = config;

            console.assert(grid.isSquare);

            const links = [],
                connectedSets = {};
            grid.forEachCell(cell => {
                const
                    eastNeighbour = cell.neighbours[DIRECTION_EAST],
                    southNeighbour = cell.neighbours[DIRECTION_SOUTH];

                if (eastNeighbour) {
                    links.push([cell, eastNeighbour]);
                }
                if (southNeighbour) {
                    links.push([cell, southNeighbour]);
                }
                cell.metadata[METADATA_SET_ID] = cell.id;
                connectedSets[cell.id] = [cell];
            });

            random.shuffle(links);

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



