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

    const prompt = `Based on the given decision tree and clinical notes, determine the probabilities observed for the given decisions 

Decision Tree
${decisionTree}

Clinical Notes:
${clinicalNotes.join('\n\n')}

You must respond with ONLY a valid JSON object in this exact format. These are probabilities of the decision points, they are arranged in the order of the decision tree:
{
    "symptomatic": <float>,
    "high_risk": <float>,
    "growth_on_followup": <float>,
    "surgical_candidate": <float>,
    "radiation_choice": {
        "srs_eligible": <float>,
        "fractionated_rt": <float>
    },
    "resection_extent": {
        "complete": <float>,
        "incomplete": <float>
    },
    "post_incomplete_treatment": {
        "observe": <float>,
        "immediate_rt": <float>
    },
    "grade_1_management": {
        "observe_only": <float>,
        "adjuvant_rt": <float>
    },
    "grade_2_management": {
        "observe": <float>,
        "immediate_rt": <float>,
        "clinical_trial": <float>
    },
    "followup_schedule": {
        "grade_1": <int>,
        "grade_2": <int>,
        "grade_3": <int>
    }
}

If there are no cases for a certain decision point, for example, if there are no cases for Grade 1 management, set the rest of the values under Grade 1 management to 0.
So, everything under grade_1_management should be 0 if there are no cases for Grade 1 management. Or if all cases were symptomatic, everything from risk level to post_incomplete_treatment should be 0.

Replace all <float> with numbers between 0 and 1, and <int> with whole numbers. Do not include any comments, explanations, or additional text in your response. Only return the JSON object.`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
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
        responseText = responseText.replace(/```json\s*|\s*```/g, '');

        // Remove any leading/trailing whitespace
        responseText = responseText.trim();

        try {
            const jsonResponse = JSON.parse(responseText);

            // Validate the response structure
            const requiredKeys = [
                'symptomatic', 'high_risk', 'growth_on_followup',
                'surgical_candidate', 'radiation_choice', 'resection_extent',
                'post_incomplete_treatment', 'grade_1_management',
                'grade_2_management', 'followup_schedule'
            ];

            const missingKeys = requiredKeys.filter(key => !(key in jsonResponse));

            if (missingKeys.length > 0) {
                throw new Error(`Missing required keys: ${missingKeys.join(', ')}`);
            }

            return Response.json(jsonResponse);
        } catch (parseError: any) {
            console.error('Failed to parse response as JSON:', parseError);
            console.error('Raw response:', responseText);
            return Response.json({
                error: 'Invalid response format',
                details: parseError.message,
                raw: responseText
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Error:', error);
        return Response.json({
            error: 'Failed to process request',
            details: error.message
        }, { status: 500 });
    }
} 