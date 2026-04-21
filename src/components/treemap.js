import React from "react";

import { treemap, hierarchy, scaleOrdinal, schemeDark2, format } from "d3";

// Helper component for rendering text inside rectangles
function Text({ node, width, height }) {
    // Only render text if the rectangle is large enough to be readable
    if (width < 30 || height < 30) return null;

    const lines = [
        ...node.data.name.split(","), 
        `Value: ${node.value}`
    ];

    return (
        <text
            x={5}
            y={15}
            fontSize="10px"
            fill="white"
            pointerEvents="none"
        >
            {lines.map((line, i) => (
                <tspan x={5} dy={i === 0 ? 0 : "1.2em"} key={i}>
                    {line.trim()}
                </tspan>
            ))}
        </text>
    );
}

export function TreeMap(props) {
    const { margin, svg_width, svg_height, tree, selectedCell, setSelectedCell } = props;
    // 1. Define inner dimensions
    const innerWidth = svg_width - margin.left - margin.right;
    const innerHeight = svg_height - margin.top - margin.bottom;

    // 2. Process data with d3.hierarchy and d3.treemap
    const root = hierarchy(tree)
        .sum(d => d.value) // Size based on the 'value' property
        .sort((a, b) => b.value - a.value);

    const treemapLayout = treemap()
        .size([innerWidth, innerHeight])
        .paddingOuter(3)
        .paddingInner(1);

    treemapLayout(root);

    // 3. Define color map
    // We use the top-level children names (e.g., heart_disease: 0) for categorical coloring
    const colorScale = scaleOrdinal(schemeDark2);

    return (
        <svg width={svg_width} height={svg_height}>
            <g transform={`translate(${margin.left},${margin.top})`}>
                {root.leaves().map((leaf, i) => {
                    const leafWidth = leaf.x1 - leaf.x0;
                    const leafHeight = leaf.y1 - leaf.y0;
                    
                    // Determine if this cell is currently selected for highlighting
                    const isSelected = selectedCell && selectedCell.data.name === leaf.data.name;

                    return (
                        <g 
                            key={i} 
                            transform={`translate(${leaf.x0},${leaf.y0})`}
                            onClick={() => setSelectedCell(leaf)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* 4. Plot the rectangles */}
                            <rect
                                width={leafWidth}
                                height={leafHeight}
                                fill={colorScale(leaf.parent.data.name)}
                                stroke={isSelected ? "black" : "white"}
                                strokeWidth={isSelected ? 3 : 1}
                                opacity={selectedCell && !isSelected ? 0.6 : 1}
                            />
                            
                            {/* 5. Add text labels */}
                            <Text 
                                node={leaf} 
                                width={leafWidth} 
                                height={leafHeight} 
                            />
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
  