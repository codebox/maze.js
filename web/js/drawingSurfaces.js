import {buildEventTarget} from './utils.js';

export const drawingSurfaces = {
    canvas(grid, config) {
        const eventTarget = buildEventTarget(),
            {el} = config,
            {width,height} = el,
            ctx = el.getContext('2d');

        el.addEventListener('click', event => {
            eventTarget.trigger(EVENT_CLICK, {
                x: invXCoord(event.offsetX),
                y: invYCoord(event.offsetY),
                shift: event.shiftKey
            });
        });

        let magnification = 1;
        function xCoord(x) {
            return x * magnification;
        }
        function invXCoord(x) {
            return x / magnification;
        }
        function yCoord(y) {
            return y * magnification;
        }
        function invYCoord(y) {
            return y / magnification;
        }
        function distance(d) {
            return d * magnification;
        }

        return {
            setSpaceRequirements(requiredWidth, requiredHeight) {
                magnification = Math.min(width/requiredWidth, height/requiredHeight);
            },
            setColour(colour) {
                ctx.strokeStyle = colour;
                ctx.fillStyle = colour;
            },
            line(x1, y1, x2, y2, existingPath = false) {
                existingPath || ctx.beginPath();
                ctx.moveTo(xCoord(x1), yCoord(y1));
                ctx.lineTo(xCoord(x2), yCoord(y2));
                existingPath || ctx.stroke();
            },
            rectangle(x1, y1, x2, y2, existingPath = false) {
                existingPath || ctx.beginPath();
                ctx.moveTo(xCoord(x1), yCoord(y1));
                ctx.fillRect(xCoord(x1), yCoord(y1), xCoord(x2) - xCoord(x1), xCoord(y2) - xCoord(y1));
                existingPath || ctx.stroke();
            },
            arc(cx, cy, r, startAngle, endAngle, counterclockwise = false, existingPath = false) {
                existingPath || ctx.beginPath();
                ctx.arc(xCoord(cx), yCoord(cy), distance(r), startAngle - Math.PI / 2, endAngle - Math.PI / 2, counterclockwise);
                existingPath || ctx.stroke();
            },
            fillSegment(cx, cy, smallR, bigR, startAngle, endAngle) {
                const
                    innerStartX = cx + smallR * Math.sin(startAngle),
                    innerStartY = cy - smallR * Math.cos(startAngle),
                    innerEndX = cx + smallR * Math.sin(endAngle),
                    innerEndY = cy - smallR * Math.cos(endAngle),
                    outerStartX = cx + bigR * Math.sin(startAngle),
                    outerStartY = cy - bigR * Math.cos(startAngle),
                    outerEndX = cx + bigR * Math.sin(endAngle),
                    outerEndY = cy - bigR * Math.cos(endAngle);
                ctx.beginPath();
                this.line(innerStartX, innerStartY, outerStartX, outerStartY, true);
                this.arc(cx, cy, bigR, startAngle, endAngle, false, true);
                this.line(outerEndX, outerEndY, innerEndX, innerEndY, true);
                this.arc(cx, cy, smallR, endAngle, startAngle, true, true);
                ctx.closePath();
                ctx.fill();
            },
            on(eventName, handler) {
                eventTarget.on(eventName, handler);
            }
        };
    },
    svg(grid, config) {
        const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
        const {el} = config,
            width = el.clientWidth,
            height = el.clientHeight;
        let magnification = 1, colour = 'black';

        function xCoord(x) {
            return x * magnification;
        }
        function yCoord(y) {
            return y * magnification;
        }
        function distance(d) {
            return d * magnification;
        }

        function polarToXy(cx, cy, d, angle) {
            return [xCoord(cx + d * Math.sin(angle)), yCoord(cy - d * Math.cos(angle))];
        }

        return {
            setSpaceRequirements(requiredWidth, requiredHeight) {
                magnification = Math.min(width/requiredWidth, height/requiredHeight);
            },
            setColour(newColour) {
                colour = newColour;
            },
            line(x1, y1, x2, y2) {
                const elLine = document.createElementNS(SVG_NAMESPACE, 'line');
                elLine.setAttribute('x1', xCoord(x1));
                elLine.setAttribute('y1', yCoord(y1));
                elLine.setAttribute('x2', xCoord(x2));
                elLine.setAttribute('y2', yCoord(y2));
                elLine.setAttribute('stroke', colour);
                el.appendChild(elLine);
            },
            rectangle(x1, y1, x2, y2) {

            },
            arc(cx, cy, r, startAngle, endAngle) {
                const [startX, startY] = polarToXy(cx, cy, r, startAngle),
                    [endX, endY] = polarToXy(cx, cy, r, endAngle),
                    radius = distance(r),
                    isLargeArc = endAngle - startAngle > Math.PI/2,
                    d = `M ${startX} ${startY} A ${radius} ${radius} 0 ${isLargeArc ? "1" : "0"} 1 ${endX} ${endY}`,
                    elPath = document.createElementNS(SVG_NAMESPACE, 'path');
                elPath.setAttribute('d', d);
                elPath.setAttribute('fill', 'none');
                elPath.setAttribute('stroke', colour);
                el.appendChild(elPath);
            },
            on(eventName, handler) {
                eventTarget.addEventListener(eventName, handler);
            }
        };
    }
}