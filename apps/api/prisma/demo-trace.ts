export type DemoTraceRelation =
  | {
      kind: "CONSUME";
      materialLotNumber: string;
      productionLotNumber: string;
      quantity: number;
    }
  | {
      kind: "SPLIT";
      parentProductionLotNumber: string;
      childProductionLotNumber: string;
      quantity: number;
    }
  | {
      kind: "MERGE";
      parentProductionLotNumber: string;
      childProductionLotNumber: string;
      quantity: number;
    }
  | {
      kind: "TRANSFORM";
      parentProductionLotNumber: string;
      childProductionLotNumber: string;
      quantity: number;
    }
  | {
      kind: "SERIALIZE";
      productionLotNumber: string;
      serialNumber: string;
    };

export const DEMO_TRACE_RELATIONS: DemoTraceRelation[] = [
  {
    kind: "CONSUME",
    materialLotNumber: "ML-2026-0301",
    productionLotNumber: "PL-2026-091A",
    quantity: 40,
  },
  {
    kind: "CONSUME",
    materialLotNumber: "ML-2026-0302",
    productionLotNumber: "PL-2026-091A",
    quantity: 25,
  },
  {
    kind: "CONSUME",
    materialLotNumber: "ML-2026-0321",
    productionLotNumber: "PL-2026-094A",
    quantity: 60,
  },
  {
    kind: "CONSUME",
    materialLotNumber: "ML-2026-0311",
    productionLotNumber: "PL-2026-095A",
    quantity: 50,
  },
  {
    kind: "CONSUME",
    materialLotNumber: "ML-2026-0331",
    productionLotNumber: "PL-2026-095A",
    quantity: 35,
  },
  {
    kind: "SPLIT",
    parentProductionLotNumber: "PL-2026-097A",
    childProductionLotNumber: "PL-2026-097B",
    quantity: 60,
  },
  {
    kind: "SPLIT",
    parentProductionLotNumber: "PL-2026-097A",
    childProductionLotNumber: "PL-2026-097C",
    quantity: 40,
  },
  {
    kind: "MERGE",
    parentProductionLotNumber: "PL-2026-094A",
    childProductionLotNumber: "PL-2026-098B",
    quantity: 50,
  },
  {
    kind: "MERGE",
    parentProductionLotNumber: "PL-2026-098A",
    childProductionLotNumber: "PL-2026-098B",
    quantity: 30,
  },
  {
    kind: "TRANSFORM",
    parentProductionLotNumber: "PL-2026-095A",
    childProductionLotNumber: "PL-2026-095R",
    quantity: 20,
  },
  {
    kind: "SERIALIZE",
    productionLotNumber: "PL-2026-095A",
    serialNumber: "FU-2026-0001",
  },
  {
    kind: "SERIALIZE",
    productionLotNumber: "PL-2026-095A",
    serialNumber: "FU-2026-0002",
  },
  {
    kind: "SERIALIZE",
    productionLotNumber: "PL-2026-095A",
    serialNumber: "FU-2026-0003",
  },
];
