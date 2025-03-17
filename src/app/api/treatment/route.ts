import { Anthropic } from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/src/resources/messages.js';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const decisionTree = `flowchart TD
    A[Initial MRI:\nSuspected Meningioma] --> B{{Decision Point 1:\nTreat as Symptomatic?}}
    
    B --> E
    B --> C
    
    C{{Decision Point 2:\nRisk Level?}}
    C --> E
    C --> D
    
    D[Watch & Scan] --> D1{{Decision Point 3:\nIntervene on Growth?}}
    D1 ---Yes--> E
    D1 ---No--> D2[Scan every 6mo]
    
    E{{Decision Point 4:\nSurgical vs Radiation?}}
    E --> G
    E --> F
    
    F{{Decision Point 5:\nRadiation Type?}}
    F --> F1[SRS Treatment]
    F --> F2[Fractionated RT]
    
    G[Surgery] --> H{{Decision Point 6:\nPost-Surgery Management by Grade}}
    
    H -->|Grade 1 Cases| I{{Decision Point 7:\nResection Goal?}}
    I --> I1
    I --> I2
    
    I1[Complete Resection] --> I1M{{Decision Point 8:\nPost-Complete Management?}}
    
    I2[Incomplete Resection] --> I2M{{Decision Point 9:\nPost-Incomplete Management?}}
    
    I1M --> L1[Grade 1 Follow-up:\nScan q6mo]
    I2M --> L1
    I2M --> Q[Consider RT]
    
    H --Grade 2 Cases--> L2[Grade 2 Follow-up:\nScan q4mo]
    
    H -->|Grade 3 Cases| L3[Grade 3 Follow-up:\nScan q3mo]
    
    L1 & L2 & L3 --> M[Standardized Monitoring Protocol]
    
    Q --> M
    
    style H fill:#f9f,stroke:#333,stroke-width:4px
    style G fill:#bbf,stroke:#333,stroke-width:4px
    style E fill:#dfd,stroke:#333,stroke-width:4px
    style M fill:#ffd,stroke:#333,stroke-width:4px`;


export async function POST(req: Request) {
    const { cases, treatmentType } = await req.json();

    // Select the appropriate clinical notes based on treatment type
    const clinicalNotes = cases.map((c: any) =>
        treatmentType === 'aggressive'
            ? c.clinical_notes.aggressive
            : c.clinical_notes.conservative
    );

    const prompt = `Based on the given clinical notes, derive a clinical decision support tree.
    Creating a node for each decision point.

Clinical Notes:
${clinicalNotes.join('\n\n')}

You must respond with ONLY a valid mermaid flowchart.

Do not include any comments, explanations, or additional text in your response.`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: prompt,
            }],
            temperature: 0.3,
        });

        let responseText = (response.content[0] as TextBlock).text;
        console.log(responseText);

        // Clean up the response text to ensure it's valid JSON
        // Remove any markdown code block indicators
        responseText = responseText.replace(/```mermaid\s*|\s*```/g, '');

        // Remove any leading/trailing whitespace
        responseText = responseText.trim();

        return Response.json(responseText);
    } catch (error: any) {
        console.error('Error:', error);
        return Response.json({
            error: 'Failed to process request',
            details: error.message
        }, { status: 500 });
    }
} 