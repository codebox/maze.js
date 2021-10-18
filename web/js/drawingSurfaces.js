export const drawingSurfaces = {
    canvas(grid, config) {
        const {el,gridWidth,gridHeight} = config,
            {width,height} = el,
            magnification = Math.min(width/gridWidth, height/gridHeight),
            ctx = el.getContext('2d');

        let colour = 'black';
        function xCoord(x) {
            return x * magnification;
        }
        function yCoord(y) {
            return y * magnification;
        }
        return {
            setColour(colour) {
                ctx.strokeStyle = colour;
            },
            line(x1, y1, x2, y2) {
                ctx.beginPath();
                ctx.moveTo(xCoord(x1), yCoord(y1));
                ctx.lineTo(xCoord(x2), yCoord(y2));
                ctx.stroke();
                // console.log(x1, y1, '-',x2, y2)
            },
            rectangle(x1, y1, x2, y2) {
                ctx.beginPath();
                ctx.moveTo(xCoord(x1), yCoord(y1));
                ctx.fillRect(xCoord(x1), yCoord(y1), xCoord(x2) - xCoord(x1), xCoord(y2) - xCoord(y1));
                ctx.stroke();
            }
        };
    },
    svg(grid, config) {

        return {
            setColour(colour) {

            },
            line(x1, y1, x2, y2) {

            },
            rectangle(x1, y1, x2, y2) {

            }
        };
    }
}