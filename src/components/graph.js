import {useEffect, useRef} from 'react'; 
import * as d3 from 'd3';
import { getNodes } from '../utils/getNodes';
import { getLinks } from '../utils/getLinks';   
import {drag} from '../utils/drag';


export function Graph(props) {
        const { margin, svg_width, svg_height, data } = props;

        const nodes = getNodes({rawData: data});
        const links = getLinks({rawData: data});
    
        const width = svg_width - margin.left - margin.right;
        const height = svg_height - margin.top - margin.bottom;

        const lineWidth = d3.scaleLinear().range([2, 6]).domain([d3.min(links, d => d.value), d3.max(links, d => d.value)]);
        const radius = d3.scaleLinear().range([10, 50])
                .domain([d3.min(nodes, d => d.value), d3.max(nodes, d => d.value)]);
        const color = d3.scaleOrdinal().range(d3.schemeCategory10).domain(nodes.map( d => d.name));
        
        const d3Selection = useRef();
        useEffect( ()=>{
            const simulation =  d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.name).distance(d => 20/d.value))
                .force("charge", d3.forceManyBody())
                .force("centrer", d3.forceCenter(width/2, height/2))
                .force("y", d3.forceY([height/2]).strength(0.02))
                .force("collide", d3.forceCollide().radius(d => radius(d.value)+20))
                .tick(3000);
            
            let g = d3.select(d3Selection.current);
            //clear all previous contents
            g.selectAll("*").remove();

            const link = g.append("g")
                .attr("stroke", "#999")
                .attr("stroke-opacity", 0.6)
                .selectAll("line")
                .data(links)
                .join("line")
                .attr("stroke-width", d => lineWidth(d.value));

            const node = g.append("g")
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.5)
                .selectAll("circle")
                .data(nodes)
                .enter();
            
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "node-tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background-color", "rgba(250, 247, 247, 0.8)")
                .style("color", "black")
                .style("padding", "8px 12px")
                .style("border-radius", "4px")
                .style("border", "black")
                .style("font-size", "14px")
                .style("font-family", "Arial, sans-serif")
                .style("pointer-events", "none")
                .style("z-index", "1000")
                .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
                .style("white-space", "nowrap");

            // Define callback functions for mouse events
            function showTooltip(event, d) {
                // Format the display name (convert camelCase to readable format)
                let displayName = d.name;
                if (displayName === "heartDisease") displayName = "Heart Disease";
                if (displayName === "ever_married") displayName = "Ever Married";
                if (displayName === "never_married") displayName = "Never Married";
                if (displayName === "hypertension") displayName = "Hypertension";
                
              
                tooltip
                    .style("visibility", "visible")
                    .html(`<strong>${displayName}</strong>`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
            
            function hideTooltip() {
                tooltip.style("visibility", "hidden");
            }


            const point = node.append("circle")
                .attr("r", d => radius(d.value))
                .attr("fill", d => color(d.name))
                .call(drag(simulation))
                .on("mouseover", showTooltip)   // Show tooltip on hover
                .on("mouseout", hideTooltip);    // Hide tooltip when mouse leaves
            
            // const node_text = node.append('text')
            //     .style("fill", "black")
            //     .attr("stroke", "black")
            //     .text(d => d.name)

            // Legend group - positioned in upper left corner
            const legend = g.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(5, 5)`);
            
            // Get unique node categories for legend (excluding heartDisease and ever_married to avoid duplicates)
            const legendItems = [
                { name: "male", display: "Male" },
                { name: "female", display: "Female" },
                { name: "heartDisease", display: "Heart Disease" },
                { name: "hypertension", display: "Hypertension" },
                { name: "stroke", display: "Stroke" },
                { name: "ever_married", display: "Ever Married" },
                { name: "never_married", display: "Never Married" }
            ];
            
            // Filter legend items to only include nodes that exist in the data
            const existingLegendItems = legendItems.filter(item => 
                nodes.some(node => node.name === item.name)
            );
            
            
            // Add legend items
            existingLegendItems.forEach((item, idx) => {
                const yPos =20+idx * 20;
                
                // Colored rectangle
                legend.append("rect")
                    .attr("x", 6)
                    .attr("y", yPos - 10)
                    .attr("width",12)
                    .attr("height",12)
                    .attr("fill", color(item.name));
                
                // Label text
                legend.append("text")
                    .attr("x", 24)
                    .attr("y", yPos)
                    .attr("font-size", "9px")
                    .attr("fill", "#555")
                    .text(item.display);
            });


            simulation.on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                point
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);
                
                // node_text
                //     .attr("x", d => d.x -radius(d.value)/4)
                //     .attr("y", d => d.y)
            });

        }, [width, height])


        return <svg 
            viewBox={`0 0 ${svg_width} ${svg_height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%" }}
            > 
                <g ref={d3Selection} transform={`translate(${margin.left}, ${margin.top})`}>
                </g>
            </svg>
    };