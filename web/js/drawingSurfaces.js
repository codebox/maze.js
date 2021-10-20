export const drawingSurfaces = {
    canvas(grid, config) {
        const {el} = config,
            {width,height} = el,
            ctx = el.getContext('2d');

        let magnification = 1;
        function xCoord(x) {
            return x * magnification;
        }
        function yCoord(y) {
            return y * magnification;
        }
        function distance(d) {
            "use strict";
            return d * magnification;
        }
        return {
            setSpaceRequirements(requiredWidth, requiredHeight) {
                magnification = Math.min(width/requiredWidth, height/requiredHeight);
            },
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
            },
            arc(cx, cy, r, startAngle, endAngle) {
                ctx.beginPath();
                ctx.arc(xCoord(cx), yCoord(cy), distance(r), startAngle - Math.PI / 2, endAngle - Math.PI / 2);
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