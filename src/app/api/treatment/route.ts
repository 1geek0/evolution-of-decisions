import { Anthropic } from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/src/resources/messages.js';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const decisionTree = `    A[Initial MRI:\nSuspected Meningioma] --> B{{Symptomatic?}}
    
    %% Asymptomatic Branch
    B -->|{1-p['symptomatic']:.1%}| C{{Risk Assessment}}
    C -->|{1-p['high_risk']:.1%}| D[Watch & Scan]
    C -->|{p['high_risk']:.1%}| E[Consider Treatment]
    
    D --> D1{{Growth on\nFollow-up?}}
    D1 -->|{1-p['growth']:.1%}| D2[Continue Annual MRI\n5 years, then biennial]
    D1 -->|{p['growth']:.1%}| E
    
    %% Risk Factors Box
    C ---- C1[Low Risk:<br>- Small size<br>- Calcified<br>- No edema<br>- T2 hypointense]
    C ---- C2[High Risk:<br>- Size >3cm<br>- No calcification<br>- Peritumoral edema<br>- Near critical structures]
    
    %% Symptomatic Branch
    B -->|{p['symptomatic']:.1%}| E
    E{{Treatment\nCandidate?}}
    
    %% Poor Surgical Branch
    E -->|{1-p['surgical_candidate']:.1%}| F[Radiation Options]
    F -->|{p['srs_vs_rt']:.1%}| F1[SRS:<br>- Size ≤3cm<br>- Single fraction<br>- >13 Gy]
    F -->|{1-p['srs_vs_rt']:.1%}| F2[Fractionated RT:<br>- Size >3cm<br>- 54-60 Gy/30fx]
    
    %% Surgical Branch
    E -->|{p['surgical_candidate']:.1%}| G[Surgery]
    G --> H{{WHO Grade?}}
    
    %% Grade 1 Branch
    H -->|80%| I{{Resection\nExtent?}}
    I -->|{p['complete_resection']:.1%}| I1[Observe:<br>Annual MRI x 5y<br>then biennial]
    I -->|{1-p['complete_resection']:.1%}| I2{{Symptoms?}}
    I2 -->|{1-p['rt_after_incomplete']:.1%}| I3[Observe or RT]
    I2 -->|{p['rt_after_incomplete']:.1%}| I4[RT/SRS]
    
    %% Grade 2/3 Branches and Follow-up remain constant
    H -->|15%| J{{Resection\nExtent?}}
    H -->|5%| K[Mandatory:<br>- RT 60 Gy/30fx<br>- Consider systemic<br>therapy if progressive]
    
    %% Follow-up Paths
    I1 & I3 & I4 --> L1[Grade 1 Follow-up:<br>Annual MRI x 5y<br>then biennial]
    J --> L2[Grade 2 Follow-up:<br>q6mo MRI x 5y<br>then annual]
    K --> L3[Grade 3 Follow-up:<br>q3-6mo MRI]
    
    %% Monitoring
    L1 & L2 & L3 --> M[Monitor:<br>- Neurology<br>- Cognition<br>- Quality of Life]`;

const jsonFormat = `{
    # Initial Assessment
    'symptomatic': <float>[0-1],
    
    # Risk Assessment
    'high_risk': <float>[0-1],
    'growth_on_followup': <float>[0-1],
    
    # Treatment Planning
    'surgical_candidate': <float>[0-1],
    'radiation_choice': {
        'srs_eligible': <float>[0-1],
        'fractionated_rt': <float>[0-1],
    },
    
    # Surgical Outcomes
    'resection_extent': {
        'complete': <float>[0-1],
        'incomplete': <float>[0-1],
    },
    
    # Post-Surgery Treatment
    'post_incomplete_treatment': {
        'observe': <float>[0-1],
        'immediate_rt': <float>[0-1],
    },
    
    # Grade-Specific Management
    'grade_1_management': {
        'observe_only': <float>[0-1],
        'adjuvant_rt': <float>[0-1],
    },
    'grade_2_management': {
        'observe': <float>[0-1],
        'immediate_rt': <float>[0-1],
        'clinical_trial': <float>[0-1],
    },
    
    # Follow-up Intensity
    'followup_schedule': {
        'grade_1': <int>,             # Months between scans for Grade 1
        'grade_2': <int>,             # Months between scans for Grade 2
        'grade_3': <int>              # Months between scans for Grade 3
    }
}`;

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

You must respond with ONLY a valid JSON object in this exact format, with no additional text or explanation:
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

Replace all <float> with numbers between 0 and 1, and <int> with whole numbers. Do not include any comments, explanations, or additional text in your response. Only return the JSON object.`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: prompt,
            }],
            temperature: 0,
        });

        let responseText = (response.content[0] as TextBlock).text;

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