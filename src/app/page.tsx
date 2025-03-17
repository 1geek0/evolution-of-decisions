'use client';

import { useState } from 'react';
import MermaidDiagram from '@/components/MermaidDiagram';
import CaseCard from '@/components/CaseCard';
import meningiomaCases from '@/data/meningioma_cases_170325.json';

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

const hasIncompleteResection = (clinicalNotes: { aggressive: string; conservative: string }) => {
  // Convert notes to lowercase for case-insensitive matching
  const combinedNotes = clinicalNotes.aggressive.toLowerCase() +
    clinicalNotes.conservative.toLowerCase();

  // Define terms indicating complete resection
  const completeTerms = [
    'complete resection',
    'gross total resection',
    'totally resected',
    'completely resected',
    'total removal',
    'Simpson Grade I',
    'Simpson Grade II',
    'Simpson Grade III'
  ];

  // If any complete resection terms are found, return false
  if (completeTerms.some(term => combinedNotes.includes(term))) {
    return false;
  }

  // Define terms indicating incomplete resection
  const incompleteTerms = [
    'subtotal resection',
  ];

  // Check if any incomplete resection term exists
  return incompleteTerms.some(term => combinedNotes.includes(term));
};

const hasCompleteResection = (clinicalNotes: { aggressive: string; conservative: string }) => {
  // Convert notes to lowercase for case-insensitive matching
  const combinedNotes = clinicalNotes.aggressive.toLowerCase() +
    clinicalNotes.conservative.toLowerCase();

  // Define terms indicating complete resection
  const completeTerms = [
    'complete resection',
    'gross total resection',
    'totally resected',
    'completely resected',
    'total removal',
    'Simpson Grade I',
    'Simpson Grade II',
    'Simpson Grade III'
  ];

  return completeTerms.some(term => combinedNotes.includes(term));
};

export default function Home() {
  const [selectedCases, setSelectedCases] = useState<number[]>([]);
  const [cdt, setCdt] = useState({
    aggressive: "",
    conservative: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  const handleCaseSelect = (index: number) => {
    setSelectedCases(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      if (prev.length >= 10) {
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

      setCdt({
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

  const handleCompleteResectionSelection = () => {
    const completeCases = meningiomaCases.meningioma_cases
      .map((caseData, index) => ({
        hasComplete: hasCompleteResection(caseData.clinical_notes),
        index
      }))
      .filter(item => item.hasComplete)
      .map(item => item.index);

    setSelectedCases(prev => {
      if (completeCases.every(index => prev.includes(index))) {
        return [];
      }
      return completeCases.slice(0, 10);
    });
  };

  const handleIncompleteResectionSelection = () => {
    const incompleteCases = meningiomaCases.meningioma_cases
      .map((caseData, index) => ({
        hasIncomplete: hasIncompleteResection(caseData.clinical_notes),
        index
      }))
      .filter(item => item.hasIncomplete)
      .map(item => item.index);

    setSelectedCases(prev => {
      if (incompleteCases.every(index => prev.includes(index))) {
        return [];
      }
      return incompleteCases.slice(0, 10);
    });
  };

  const handleResetSelection = () => {
    setSelectedCases([]);
  };

  // TODO: Under the Grade 1 management add 'Radiotherapy/RT' yes/no node
  // TODO: Use the same structure for Grade 2 and Grade 3 management
  // TODO: Aggressive path would have a bias towards RT
  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <div className="fixed w-[400px] h-screen overflow-y-auto border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
        {/* Case Selection Area */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold mb-2">Patient Cases</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select up to 10 cases to analyze treatment paths. Each case represents a unique patient with different risk factors and symptoms.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleCompleteResectionSelection}
                className="w-full py-1.5 px-3 rounded-lg text-sm font-medium transition-colors bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
              >
                Auto-Select Complete Resection Cases
              </button>
              <button
                onClick={handleIncompleteResectionSelection}
                className="w-full py-1.5 px-3 rounded-lg text-sm font-medium transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
              >
                Auto-Select Incomplete Resection Cases
              </button>
              <button
                onClick={handleResetSelection}
                className="w-full py-1.5 px-3 rounded-lg text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Reset Selection
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Selected cases: {selectedCases.length} / 10
              </div>
            </div>
            {selectedCases.length === 20 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                Maximum of 10 cases selected
              </p>
            )}
          </div>
          <div className="space-y-3">
            {meningiomaCases.meningioma_cases.map((caseData, index) => (
              <CaseCard
                key={index}
                age={caseData.demographics.age}
                gender={caseData.demographics.gender}
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Meningioma Treatment Decision Flow</h1>
          <a
            href="https://github.com/1geek0/evolution-of-decisions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span>View on GitHub</span>
          </a>
        </div>

        <div className="mb-8 space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            This tool helps visualize treatment decisions for meningioma cases. The diagram shows both aggressive (🔴) and conservative (🔵) treatment probabilities side by side.
          </p>

          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
            <li>Select up to 10 patient cases from the sidebar</li>
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
          <MermaidDiagram chart={cdt.aggressive} />
          {/* <MermaidDiagram chart={cdt.conservative} /> */}
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
