import { useState } from 'react';
import ClinicalModal from './ClinicalModal';

interface CaseCardProps {
    age: number;
    gender: string;
    occupation: {
        knowledge_worker: boolean;
        knowledge_worker_profession: string | null;
        olfactory_profession: string | null;
        stage_artist: boolean;
    };
    clinicalData: {
        presenting_symptoms: string[] | string;
        medical_history: string[] | string;
        treatment_path: {
            initial_action: string;
            imaging_type: string;
            steps: string[];
            monitoring_plan: string;
            surgical_approach: string;
            radiation_needed: boolean;
            follow_up: string;
        };
    };
    clinicalNotes: {
        aggressive: string;
        conservative: string;
    };
    isSelected: boolean;
    onSelect: () => void;
}

export default function CaseCard({ age, gender, occupation, clinicalData, clinicalNotes, isSelected, onSelect }: CaseCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getOccupation = () => {
        if (occupation.knowledge_worker_profession) return occupation.knowledge_worker_profession;
        if (occupation.olfactory_profession) return occupation.olfactory_profession;
        if (occupation.stage_artist) return "Stage Artist";
        return "Not specified";
    };

    return (
        <>
            <div
                className={`p-4 mb-3 rounded-xl border transition-all ${isSelected
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}
            >
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-medium text-base">{age} y/o {gender}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{getOccupation()}</p>
                        </div>
                        {isSelected && (
                            <span className="text-blue-500 text-xs font-medium bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded-full">
                                Selected
                            </span>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsModalOpen(true);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                            View Clinical Notes
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isSelected
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                                }`}
                        >
                            {isSelected ? 'Deselect' : 'Select'}
                        </button>
                    </div>
                </div>
            </div>

            <ClinicalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                demographics={{
                    age,
                    gender,
                    occupation
                }}
                clinicalData={clinicalData}
                clinicalNotes={clinicalNotes}
            />
        </>
    );
}
