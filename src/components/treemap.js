// import React from "react";

import { useState } from "react";
import { treemap, hierarchy, scaleOrdinal, schemeDark2, format } from "d3";

// Text inside leaf cell — only renders if cell is big enough
function LeafText(props) {
    const { d, attributes } = props;
    const width = d.x1 - d.x0;
    const height = d.y1 - d.y0;
    if (width < 25 || height < 18) return null;

    const attrName = attributes && attributes[d.depth - 1] ? attributes[d.depth - 1] : "";
    const leafLabel = attrName ? `${attrName}: ${d.data.name}` : d.data.name;
    const pct = d.parent && d.parent.value > 0
        ? format(".1%")(d.value / d.parent.value)
        : "—";

    return (
        <foreignObject width={width} height={height} style={{ pointerEvents: "none" }}>
            <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                    padding: "3px 4px",
                    fontSize: width > 80 ? "11px" : "9px",
                    fontFamily: "monospace",
                    color: "white",
                    overflow: "hidden",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    height: "100%",
                    boxSizing: "border-box",
                    lineHeight: "1.4",
                }}
            >
                <div>{leafLabel}</div>
                <div>{`Value: ${pct}`}</div>
            </div>
        </foreignObject>
    );
}

// Tooltip shown on hover for any cell (especially small ones whose text is hidden)
function Tooltip(props) {
    const { node, attributes, mouseX, mouseY } = props;
    if (!node || mouseX === null) return null;

    const attrName = attributes && attributes[node.depth - 1] ? attributes[node.depth - 1] : "";
    const leafLabel = attrName ? `${attrName}: ${node.data.name}` : node.data.name;
    const pct = node.parent && node.parent.value > 0
        ? format(".1%")(node.value / node.parent.value)
        : "—";

    // Build full path: all ancestors except root
    const path = node.ancestors().reverse().slice(1)
        .map((a, i) => {
            const name = attributes && attributes[i] ? attributes[i] : "";
            return name ? `${name}: ${a.data.name}` : a.data.name;
        })
        .join(" › ");

    return (
        <div style={{
            position: "fixed",
            left: mouseX + 12,
            top: mouseY + 12,
            background: "rgba(30,30,30,0.92)",
            color: "white",
            fontFamily: "monospace",
            fontSize: "12px",
            padding: "7px 10px",
            borderRadius: "5px",
            pointerEvents: "none",
            zIndex: 9999,
            lineHeight: "1.6",
            maxWidth: "220px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}>
            <div style={{ opacity: 0.7, fontSize: "10px", marginBottom: "2px" }}>{path}</div>
            <div><b>{leafLabel}</b></div>
            <div>Value: {pct}</div>
            <div>Count: {node.value}</div>
        </div>
    );
}

// Legend above the chart
function Legend(props) {
    const { colorDomain, colorScale, attrName } = props;
    if (!colorDomain || colorDomain.length === 0) return null;
    return (
        <div style={{
            display: "flex",
            gap: "16px",
            marginBottom: "6px",
            flexWrap: "wrap",
            fontFamily: "monospace",
            fontSize: "13px",
            alignItems: "center",
        }}>
            {colorDomain.map((name, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{
                        width: "14px",
                        height: "14px",
                        backgroundColor: colorScale(name),
                        borderRadius: "2px",
                        flexShrink: 0,
                    }} />
                    <span>{attrName ? `${attrName}: ${name}` : name}</span>
                </div>
            ))}
        </div>
    );
}

export function TreeMap(props) {
    const { margin, svg_width, svg_height, tree, selectedCell, setSelectedCell, attributes } = props;

    const [mouseX, setMouseX] = useState(null);
    const [mouseY, setMouseY] = useState(null);

    const innerWidth = svg_width - margin.left - margin.right;
    const innerHeight = svg_height - margin.top - margin.bottom;

    const treemapLayout = treemap()
        .size([innerWidth, innerHeight])
        .padding(1)
        .round(true);

    const root = hierarchy(tree)
        .sum(d => {
            if (d.children && d.children.length > 0) return 0;
            if (d.group) return d.group.length;
            if (typeof d.value === "number") return d.value;
            return 1;
        })
        .sort((a, b) => b.value - a.value);

    treemapLayout(root);

    const firstLayer = root.children || [];
    const secondLayer = firstLayer.flatMap(d => d.children || []);
    const secondLayerNames = [...new Set(secondLayer.map(d => d.data.name))];
    const color = scaleOrdinal(schemeDark2).domain(secondLayerNames);
    const leaves = root.leaves();

    const attr1 = attributes && attributes[0] ? attributes[0] : "";
    const attr2 = attributes && attributes[1] ? attributes[1] : "";

    return (
        <div style={{ position: "relative" }}>
            <Legend colorDomain={secondLayerNames} colorScale={color} attrName={attr2} />

            <svg
                viewBox={`0 0 ${svg_width} ${svg_height}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ width: "100%", height: "100%" }}
            >
                <g transform={`translate(${margin.left}, ${margin.top})`}>

                    {/* Leaf rectangles */}
                    {leaves.map((d, idx) => {
                        let colorNode = d;
                        while (colorNode.depth > 2 && colorNode.parent) {
                            colorNode = colorNode.parent;
                        }
                        const fillColor = color(colorNode.data.name);

                        const isSelected =
                            selectedCell &&
                            d.data.name === selectedCell.data.name &&
                            d.parent?.data.name === selectedCell.parent?.data.name &&
                            d.parent?.parent?.data.name === selectedCell.parent?.parent?.data.name;

                        return (
                            <g
                                key={idx + "leaf"}
                                transform={`translate(${d.x0}, ${d.y0})`}
                                style={{ cursor: "pointer" }}
                                onMouseMove={(e) => {
                                    setSelectedCell(d);
                                    setMouseX(e.clientX);
                                    setMouseY(e.clientY);
                                }}
                                onMouseOut={() => {
                                    setSelectedCell(null);
                                    setMouseX(null);
                                    setMouseY(null);
                                }}
                            >
                                <rect
                                    width={d.x1 - d.x0}
                                    height={d.y1 - d.y0}
                                    fill={isSelected ? "red" : fillColor}
                                    stroke="white"
                                    strokeWidth={0.5}
                                    opacity={0.85}
                                />
                                <LeafText d={d} attributes={attributes} />
                            </g>
                        );
                    })}

                    {/* First-layer: border + bold background label */}
                    {firstLayer.map((d, idx) => {
                        const w = d.x1 - d.x0;
                        const h = d.y1 - d.y0;
                        const label = attr1 ? `${attr1}: ${d.data.name}` : d.data.name;
                        const isHorizontal = w > h;

                        const availableLength = isHorizontal ? w : h;
                        const fontByLength = availableLength / (label.length * 0.6);
                        const fontByCross = (isHorizontal ? h : w) * 0.3;
                        const fontSize = Math.min(fontByLength, fontByCross, 40);

                        return (
                            <g key={idx + "first"} transform={`translate(${d.x0}, ${d.y0})`}
                                style={{ pointerEvents: "none" }}>
                                <rect
                                    width={w}
                                    height={h}
                                    fill="none"
                                    stroke="black"
                                    strokeWidth={1}
                                />
                                <text
                                    x={w / 2}
                                    y={h / 2}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    opacity={0.35}
                                    fontSize={fontSize}
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    transform={`rotate(${isHorizontal ? 0 : 90}, ${w / 2}, ${h / 2})`}
                                >
                                    {label}
                                </text>
                            </g>
                        );
                    })}

                </g>
            </svg>

            {/* Tooltip: always shown on hover, critical for small cells */}
            <Tooltip
                node={selectedCell}
                attributes={attributes}
                mouseX={mouseX}
                mouseY={mouseY}
            />
        </div>
    );
}