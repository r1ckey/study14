const studyData = {
    title: "SQL Mastery",
    subtitle: "Architecture & Practical Playbook",
    localStorageKey: "sql_mastery_progress",
    themeColor: "#06b6d4",
    secondaryColor: "#3b82f6",
    axes: [
        {
            title: "Phase 1: Design Philosophy",
            modules: [
                { id: "1.1", title: "Output Driven Architecture", file: "Phase1/1.1_Output_Driven_Architecture.md" },
                { id: "1.2", title: "Logical vs Physical Design", file: "Phase1/1.2_Logical_vs_Physical_Design.md" }
            ]
        },
        {
            title: "Phase 2: Cleansing & Prep",
            modules: [
                { id: "2.1", title: "Handling Duplicates (ROW_NUMBER)", file: "Phase2/2.1_Handling_Duplicates_ROW_NUMBER.md" },
                { id: "2.2", title: "Gap Filling (LEAD/LAG)", file: "Phase2/2.2_Gap_Filling_LEAD_LAG.md" },
                { id: "2.3", title: "Flattening Arrays (EXPLODE)", file: "Phase2/2.3_Flattening_Arrays_EXPLODE.md" }
            ]
        },
        {
            title: "Phase 3: Transformation",
            modules: [
                { id: "3.1", title: "Row to Column (PIVOT)", file: "Phase3/3.1_Row_to_Column_PIVOT.md" },
                { id: "3.2", title: "Time Series & Windows", file: "Phase3/3.2_Time_Series_and_Windows.md" },
                { id: "3.3", title: "Difference Extraction (EXCEPT)", file: "Phase3/3.3_Difference_Extraction_EXCEPT.md" }
            ]
        },
        {
            title: "Phase 4: ETL & Tuning",
            modules: [
                { id: "4.1", title: "MERGE INTO Anatomy", file: "Phase4/4.1_MERGE_INTO_Anatomy.md" },
                { id: "4.2", title: "SCD Type 2 Implementation", file: "Phase4/4.2_SCD_Type_2_Implementation.md" },
                { id: "4.3", title: "Performance Troubleshooting", file: "Phase4/4.3_Performance_Troubleshooting.md" }
            ]
        }
    ]
};
