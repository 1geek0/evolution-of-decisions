interface CaseCardProps {
    age: number;
    gender: string;
    occupation: {
        knowledge_worker: boolean;
        knowledge_worker_profession: string | null;
        olfactory_profession: string | null;
        stage_artist: boolean;
    };
    isSelected: boolean;
    onSelect: () => void;
}

export default function CaseCard({ age, gender, occupation, isSelected, onSelect }: CaseCardProps) {
    const getOccupation = () => {
        if (occupation.knowledge_worker_profession) return occupation.knowledge_worker_profession;
        if (occupation.olfactory_profession) return occupation.olfactory_profession;
        if (occupation.stage_artist) return "Stage Artist";
        return "Not specified";
    };

    return (
        <div
            onClick={onSelect}
            className={`p-3 rounded-lg border cursor-pointer transition-all text-sm ${isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
        >
            <div className="space-y-0.5">
                <div className="flex justify-between items-center">
                    <span className="font-medium">{age} y/o {gender}</span>
                    {isSelected && (
                        <span className="text-blue-500 text-xs">Selected</span>
                    )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 truncate">{getOccupation()}</p>
            </div>
        </div>
    );
}
