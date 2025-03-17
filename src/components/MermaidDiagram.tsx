'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
    chart: string;
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: 'monospace',
            fontSize: 14,
            themeVariables: {
                primaryColor: '#1e1e1e',
                primaryTextColor: '#fff',
                primaryBorderColor: '#666',
                lineColor: '#666',
                secondaryColor: '#252525',
                tertiaryColor: '#353535',
            }
        });

        const renderDiagram = async () => {
            if (containerRef.current && chart) {
                try {
                    // Generate a CSS-safe unique ID
                    const uniqueId = `mermaid-diagram-${Math.random().toString(36).substring(2, 15)}`;
                    const { svg } = await mermaid.render(uniqueId, chart);
                    if (containerRef.current) {
                        containerRef.current.innerHTML = svg;
                        // Find the SVG element and set its width
                        const svgElement = containerRef.current.querySelector('svg');
                        if (svgElement) {
                            svgElement.style.width = '100%';
                            svgElement.style.height = 'auto';
                            svgElement.style.minWidth = '800px'; // Ensure minimum readable width
                        }
                    }
                } catch (error) {
                    console.error('Failed to render diagram:', error);
                    // Add more detailed error logging
                    if (error instanceof Error) {
                        console.error('Error details:', error.message);
                    }
                }
            }
        };

        renderDiagram();
    }, [chart]);

    return (
        <div className="w-full overflow-x-auto">
            <div ref={containerRef} className="min-w-[800px] w-full" />
        </div>
    );
}
