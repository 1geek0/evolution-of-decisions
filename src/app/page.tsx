'use client';

import { useState } from 'react';
import MermaidDiagram from '@/components/MermaidDiagram';
import CaseCard from '@/components/CaseCard';
import meningiomaCases from '@/data/meningioma_cases.json';

// Initial probabilities
const initialP = {
  "symptomatic": 1.0,
  "high_risk": 0.8,
  "growth_on_followup": 0.0,
  "surgical_candidate": 0.4,
  "radiation_choice": {
    "srs_eligible": 0.7,
    "fractionated_rt": 0.3
  },
  "resection_extent": {
    "complete": 0.0,
    "incomplete": 0.0
  },
  "post_incomplete_treatment": {
    "observe": 0.0,
    "immediate_rt": 0.0
  },
  "grade_1_management": {
    "observe_only": 0.6,
    "adjuvant_rt": 0.4
  },
  "grade_2_management": {
    "observe": 0.0,
    "immediate_rt": 0.0,
    "clinical_trial": 0.0
  },
  "followup_schedule": {
    "grade_1": 3,
    "grade_2": 3,
    "grade_3": 2
  }
};

export default function Home() {
  const [selectedCases, setSelectedCases] = useState<number[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<'aggressive' | 'conservative' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [probabilities, setProbabilities] = useState(initialP);
  const [isUpdated, setIsUpdated] = useState(false);

  const handleCaseSelect = (index: number) => {
    setSelectedCases(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, index];
    });
  };

  const handleTreatmentSelect = async (treatment: 'aggressive' | 'conservative') => {
    setSelectedTreatment(treatment);
    setIsLoading(true);

    try {
      const selectedCaseData = selectedCases.map(index => meningiomaCases.meningioma_cases[index]);

      const response = await fetch('/api/treatment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cases: selectedCaseData,
          treatmentType: treatment,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const newProbabilities = await response.json();
      if (newProbabilities.error) {
        throw new Error(newProbabilities.error);
      }

      setProbabilities(newProbabilities);
      setIsUpdated(true);
      setTimeout(() => setIsUpdated(false), 2000);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Mermaid diagram with current probabilities
  const getMermaidDiagram = () => `flowchart TD
    A[Initial MRI:\nSuspected Meningioma] --> B{{Decision Point 1:\nTreat as Symptomatic?}}
    
    B -->|Treat as Symptomatic\n${(probabilities.symptomatic * 100).toFixed(1)}%| E
    B -->|Treat as Asymptomatic\n${((1 - probabilities.symptomatic) * 100).toFixed(1)}%| C
    
    C{{Decision Point 2:\nRisk Level?}}
    C -->|Classify High Risk\n${(probabilities.high_risk * 100).toFixed(1)}%| E
    C -->|Classify Low Risk\n${((1 - probabilities.high_risk) * 100).toFixed(1)}%| D
    
    D[Watch & Scan] --> D1{{Decision Point 3:\nIntervene on Growth?}}
    D1 -->|Intervene\n${(probabilities.growth_on_followup * 100).toFixed(1)}%| E
    D1 -->|Continue Monitoring\n${((1 - probabilities.growth_on_followup) * 100).toFixed(1)}%| D2[Scan every ${probabilities.followup_schedule.grade_1}mo]
    
    E{{Decision Point 4:\nSurgical vs Radiation?}}
    E -->|Choose Surgery\n${(probabilities.surgical_candidate * 100).toFixed(1)}%| G
    E -->|Choose Radiation\n${((1 - probabilities.surgical_candidate) * 100).toFixed(1)}%| F
    
    F{{Decision Point 5:\nRadiation Type?}}
    F -->|Choose SRS\n${(probabilities.radiation_choice.srs_eligible * 100).toFixed(1)}%| F1[SRS Treatment]
    F -->|Choose Fractionated\n${(probabilities.radiation_choice.fractionated_rt * 100).toFixed(1)}%| F2[Fractionated RT]
    
    G[Surgery] --> H{{Decision Point 6:\nPost-Surgery Management by Grade}}
    
    H -->|Grade 1 Cases| I{{Decision Point 7:\nResection Goal?}}
    I -->|Attempt Complete\n${(probabilities.resection_extent.complete * 100).toFixed(1)}%| I1
    I -->|Accept Partial\n${(probabilities.resection_extent.incomplete * 100).toFixed(1)}%| I2
    
    I1[Complete Resection] --> I1M{{Decision Point 8:\nPost-Complete Management?}}
    I1M -->|Observe Only\n${(probabilities.grade_1_management.observe_only * 100).toFixed(1)}%| I1O
    I1M -->|Add RT\n${(probabilities.grade_1_management.adjuvant_rt * 100).toFixed(1)}%| I1R
    
    I2[Incomplete Resection] --> I2M{{Decision Point 9:\nPost-Incomplete Management?}}
    I2M -->|Observe\n${(probabilities.post_incomplete_treatment.observe * 100).toFixed(1)}%| I2O
    I2M -->|Add RT\n${(probabilities.post_incomplete_treatment.immediate_rt * 100).toFixed(1)}%| I2R
    
    H -->|Grade 2 Cases| J{{Decision Point 10:\nGrade 2 Management?}}
    J -->|Observation\n${(probabilities.grade_2_management.observe * 100).toFixed(1)}%| J1
    J -->|Immediate RT\n${(probabilities.grade_2_management.immediate_rt * 100).toFixed(1)}%| J2
    J -->|Clinical Trial\n${(probabilities.grade_2_management.clinical_trial * 100).toFixed(1)}%| J3
    
    H -->|Grade 3 Cases| K[Standard Grade 3 Protocol]
    
    I1O & I1R & I2O & I2R --> L1[Grade 1 Follow-up:\nScan q${probabilities.followup_schedule.grade_1}mo]
    J1 & J2 & J3 --> L2[Grade 2 Follow-up:\nScan q${probabilities.followup_schedule.grade_2}mo]
    K --> L3[Grade 3 Follow-up:\nScan q${probabilities.followup_schedule.grade_3}mo]
    
    L1 & L2 & L3 --> M[Standardized Monitoring Protocol]
    
    style H fill:#f9f,stroke:#333,stroke-width:4px
    style G fill:#bbf,stroke:#333,stroke-width:4px
    style E fill:#dfd,stroke:#333,stroke-width:4px
    style M fill:#ffd,stroke:#333,stroke-width:4px`;

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <div className="w-[400px] h-screen overflow-y-auto border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
        {/* Case Selection Area */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Select Cases (max 5)</h2>
          <div className="space-y-3">
            {meningiomaCases.meningioma_cases.map((caseData, index) => (
              <CaseCard
                key={index}
                age={caseData.demographics.age}
                gender={caseData.demographics.gender}
                occupation={caseData.demographics.occupation}
                isSelected={selectedCases.includes(index)}
                onSelect={() => handleCaseSelect(index)}
              />
            ))}
          </div>
        </div>

        {/* Treatment Selection Area */}
        {selectedCases.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="space-y-2">
              <button
                onClick={() => handleTreatmentSelect('aggressive')}
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${selectedTreatment === 'aggressive'
                  ? 'bg-red-500 text-white'
                  : 'bg-white hover:bg-red-50 border border-red-500 text-red-500'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading && selectedTreatment === 'aggressive' ? 'Processing...' : 'Aggressive Treatment'}
              </button>
              <button
                onClick={() => handleTreatmentSelect('conservative')}
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${selectedTreatment === 'conservative'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white hover:bg-blue-50 border border-blue-500 text-blue-500'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading && selectedTreatment === 'conservative' ? 'Processing...' : 'Conservative Treatment'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-8">Meningioma Treatment Decision Flow</h1>
        <div className={`w-full transition-all duration-500 ${isUpdated ? 'bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-4' : ''
          }`}>
          <MermaidDiagram chart={getMermaidDiagram()} />
        </div>

        {/* Add a status indicator */}
        {isUpdated && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 animate-fade-out">
            ↑ Values updated based on {selectedTreatment} treatment approach
          </div>
        )}
      </div>
    </div>
  );
}
