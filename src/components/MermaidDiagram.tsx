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

        if (containerRef.current) {
            mermaid.render('mermaid-diagram', chart).then(({ svg }) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            });
        }
    }, [chart]);

    return <div ref={containerRef} className="w-full overflow-x-auto" />;
}
