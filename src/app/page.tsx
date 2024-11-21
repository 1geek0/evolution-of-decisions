'use client';

import { useState } from 'react';
import MermaidDiagram from '@/components/MermaidDiagram';
import CaseCard from '@/components/CaseCard';
import meningiomaCases from '@/data/meningioma_cases_201124_v3.json';

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

const hasRecurrence = (clinicalNotes: { aggressive: string; conservative: string }) => {
  // Convert notes to lowercase for case-insensitive matching
  const combinedNotes = clinicalNotes.aggressive.toLowerCase() +
    clinicalNotes.conservative.toLowerCase();

  // Define negative contexts
  const negativeContexts = [
    'no recurrence',
    'without recurrence',
    'hasn\'t recurred',
    'has not recurred',
    'free from recurrence',
    'no sign of recurrence',
    'no evidence of recurrence'
  ];

  // Check if any negative context exists
  if (negativeContexts.some(context => combinedNotes.includes(context))) {
    return false;
  }

  // Check for positive recurrence mentions
  return combinedNotes.includes('recurrence') ||
    combinedNotes.includes('recurred') ||
    combinedNotes.includes('recurring');
};

export default function Home() {
  const [selectedCases, setSelectedCases] = useState<number[]>([]);
  const [probabilities, setProbabilities] = useState({
    aggressive: initialP,
    conservative: initialP
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  const handleCaseSelect = (index: number) => {
    setSelectedCases(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      if (prev.length >= 20) {
        return prev;
      }
      return [...prev, index];
    });
  };

  const updateProbabilities = async () => {
    setIsLoading(true);

    try {
      const selectedCaseData = selectedCases.map(index => meningiomaCases.meningioma_cases[index]);

      // Fetch both treatment probabilities in parallel
      const [aggressiveResponse, conservativeResponse] = await Promise.all([
        fetch('/api/treatment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cases: selectedCaseData,
            treatmentType: 'aggressive',
          }),
        }),
        fetch('/api/treatment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cases: selectedCaseData,
            treatmentType: 'conservative',
          }),
        })
      ]);

      const [aggressiveProbs, conservativeProbs] = await Promise.all([
        aggressiveResponse.json(),
        conservativeResponse.json()
      ]);

      setProbabilities({
        aggressive: aggressiveProbs,
        conservative: conservativeProbs
      });
      setIsUpdated(true);
      setTimeout(() => setIsUpdated(false), 2000);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecurrenceSelection = () => {
    const recurrenceCases = meningiomaCases.meningioma_cases
      .map((caseData, index) => ({ hasRecurrence: hasRecurrence(caseData.clinical_notes), index }))
      .filter(item => item.hasRecurrence)
      .map(item => item.index);

    setSelectedCases(prev => {
      // If all recurrence cases are already selected, deselect them
      if (recurrenceCases.every(index => prev.includes(index))) {
        return prev.filter(index => !recurrenceCases.includes(index));
      }
      // Otherwise, add recurrence cases (up to 20 total cases)
      const remainingSlots = 20 - prev.length;
      const casesToAdd = recurrenceCases
        .filter(index => !prev.includes(index))
        .slice(0, remainingSlots);
      return [...prev, ...casesToAdd];
    });
  };

  // Generate Mermaid diagram with current probabilities
  const getMermaidDiagram = () => `flowchart TD
    A[Initial MRI:\nSuspected Meningioma] --> B{{Decision Point 1:\nTreat as Symptomatic?}}
    
    B -->|"🔴 ${(probabilities.aggressive.symptomatic * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.symptomatic * 100).toFixed(1)}%"| E
    B -->|"🔴 ${((1 - probabilities.aggressive.symptomatic) * 100).toFixed(1)}%\n🔵 ${((1 - probabilities.conservative.symptomatic) * 100).toFixed(1)}%"| C
    
    C{{Decision Point 2:\nRisk Level?}}
    C -->|"🔴 ${(probabilities.aggressive.high_risk * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.high_risk * 100).toFixed(1)}%"| E
    C -->|"🔴 ${((1 - probabilities.aggressive.high_risk) * 100).toFixed(1)}%\n🔵 ${((1 - probabilities.conservative.high_risk) * 100).toFixed(1)}%"| D
    
    D[Watch & Scan] --> D1{{Decision Point 3:\nIntervene on Growth?}}
    D1 -->|"🔴 ${(probabilities.aggressive.growth_on_followup * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.growth_on_followup * 100).toFixed(1)}%"| E
    D1 -->|"🔴 ${((1 - probabilities.aggressive.growth_on_followup) * 100).toFixed(1)}%\n🔵 ${((1 - probabilities.conservative.growth_on_followup) * 100).toFixed(1)}%"| D2[Scan every ${probabilities.aggressive.followup_schedule.grade_1}mo]
    
    E{{Decision Point 4:\nSurgical vs Radiation?}}
    E -->|"🔴 ${(probabilities.aggressive.surgical_candidate * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.surgical_candidate * 100).toFixed(1)}%"| G
    E -->|"🔴 ${((1 - probabilities.aggressive.surgical_candidate) * 100).toFixed(1)}%\n🔵 ${((1 - probabilities.conservative.surgical_candidate) * 100).toFixed(1)}%"| F
    
    F{{Decision Point 5:\nRadiation Type?}}
    F -->|"🔴 ${(probabilities.aggressive.radiation_choice.srs_eligible * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.radiation_choice.srs_eligible * 100).toFixed(1)}%"| F1[SRS Treatment]
    F -->|"🔴 ${(probabilities.aggressive.radiation_choice.fractionated_rt * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.radiation_choice.fractionated_rt * 100).toFixed(1)}%"| F2[Fractionated RT]
    
    G[Surgery] --> H{{Decision Point 6:\nPost-Surgery Management by Grade}}
    
    H -->|Grade 1 Cases| I{{Decision Point 7:\nResection Goal?}}
    I -->|"🔴 ${(probabilities.aggressive.resection_extent.complete * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.resection_extent.complete * 100).toFixed(1)}%"| I1
    I -->|"🔴 ${(probabilities.aggressive.resection_extent.incomplete * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.resection_extent.incomplete * 100).toFixed(1)}%"| I2
    
    I1[Complete Resection] --> I1M{{Decision Point 8:\nPost-Complete Management?}}
    I1M -->|"🔴 ${(probabilities.aggressive.grade_1_management.observe_only * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.grade_1_management.observe_only * 100).toFixed(1)}%"| I1O
    I1M -->|"🔴 ${(probabilities.aggressive.grade_1_management.adjuvant_rt * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.grade_1_management.adjuvant_rt * 100).toFixed(1)}%"| I1R
    
    I2[Incomplete Resection] --> I2M{{Decision Point 9:\nPost-Incomplete Management?}}
    I2M -->|"🔴 ${(probabilities.aggressive.post_incomplete_treatment.observe * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.post_incomplete_treatment.observe * 100).toFixed(1)}%"| I2O
    I2M -->|"🔴 ${(probabilities.aggressive.post_incomplete_treatment.immediate_rt * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.post_incomplete_treatment.immediate_rt * 100).toFixed(1)}%"| I2R
    
    H -->|Grade 2 Cases| J{{Decision Point 10:\nGrade 2 Management?}}
    J -->|"🔴 ${(probabilities.aggressive.grade_2_management.observe * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.grade_2_management.observe * 100).toFixed(1)}%"| J1
    J -->|"🔴 ${(probabilities.aggressive.grade_2_management.immediate_rt * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.grade_2_management.immediate_rt * 100).toFixed(1)}%"| J2
    J -->|"🔴 ${(probabilities.aggressive.grade_2_management.clinical_trial * 100).toFixed(1)}%\n🔵 ${(probabilities.conservative.grade_2_management.clinical_trial * 100).toFixed(1)}%"| J3
    
    H -->|Grade 3 Cases| K[Standard Grade 3 Protocol]
    
    I1O & I1R & I2O & I2R --> L1[Grade 1 Follow-up:\nScan q${probabilities.aggressive.followup_schedule.grade_1}mo]
    J1 & J2 & J3 --> L2[Grade 2 Follow-up:\nScan q${probabilities.aggressive.followup_schedule.grade_2}mo]
    K --> L3[Grade 3 Follow-up:\nScan q${probabilities.aggressive.followup_schedule.grade_3}mo]
    
    L1 & L2 & L3 --> M[Standardized Monitoring Protocol]
    
    style H fill:#f9f,stroke:#333,stroke-width:4px
    style G fill:#bbf,stroke:#333,stroke-width:4px
    style E fill:#dfd,stroke:#333,stroke-width:4px
    style M fill:#ffd,stroke:#333,stroke-width:4px`;

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <div className="fixed w-[400px] h-screen overflow-y-auto border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
        {/* Case Selection Area */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold mb-2">Patient Cases</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select up to 20 cases to analyze treatment paths. Each case represents a unique patient with different risk factors and symptoms.
            </p>
            <button
              onClick={handleRecurrenceSelection}
              className="w-full py-1.5 px-3 rounded-lg text-sm font-medium transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
              Auto-Select Recurrence Cases
            </button>
            {selectedCases.length === 20 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                Maximum of 20 cases selected
              </p>
            )}
          </div>
          <div className="space-y-3">
            {meningiomaCases.meningioma_cases.map((caseData, index) => (
              <CaseCard
                key={index}
                age={caseData.demographics.age}
                gender={caseData.demographics.gender}
                occupation={caseData.demographics.occupation}
                clinicalData={caseData.clinical_data}
                clinicalNotes={caseData.clinical_notes}
                isSelected={selectedCases.includes(index)}
                onSelect={() => handleCaseSelect(index)}
              />
            ))}
          </div>
        </div>

        {/* Treatment Selection Area */}
        {selectedCases.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={updateProbabilities}
              disabled={isLoading || selectedCases.length === 0}
              className="w-full py-2 px-4 rounded-lg transition-colors bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Update Probabilities'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="ml-[400px] flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Meningioma Treatment Decision Flow</h1>

        <div className="mb-8 space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            This tool helps visualize treatment decisions for meningioma cases. The diagram shows both aggressive (🔴) and conservative (🔵) treatment probabilities side by side.
          </p>

          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
            <li>Select up to 20 patient cases from the sidebar</li>
            <li>Click "Update Probabilities" to analyze both treatment approaches</li>
            <li>The flow diagram will update to show probability paths where:
              <ul className="list-disc list-inside ml-6 mt-2">
                <li>🔴 Red values represent aggressive treatment probabilities</li>
                <li>🔵 Blue values represent conservative treatment probabilities</li>
              </ul>
            </li>
          </ol>

          {selectedCases.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm">👈 Start by selecting some patient cases from the sidebar</p>
            </div>
          )}

          {selectedCases.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm">Click "Update Probabilities" below the selected cases to analyze both treatment approaches</p>
            </div>
          )}
        </div>

        <div className={`w-full transition-all duration-500 ${isUpdated ? 'bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-4' : ''}`}>
          <MermaidDiagram chart={getMermaidDiagram()} />
        </div>

        {/* Add a status indicator */}
        {isUpdated && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 animate-fade-out">
            ↑ Values updated based on {selectedCases.length > 0 ? 'aggressive' : 'conservative'} treatment approach
          </div>
        )}
      </div>
    </div>
  );
}
