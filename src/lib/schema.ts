import { z } from 'zod';

export const bases = ['coauthorship', 'joint_project', 'shared_appointment', 'shared_institution', 'shared_venue', 'shared_field', 'phd_advisor', 'committee', 'phd_institution', 'research_group'] as const;
export const nodeKinds = ['person', 'lab', 'institution', 'university'] as const;
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Use an ISO date such as 2026-10-08');

/** One retrieval of one source. The same URL retrieved on two dates is two provenance records. */
export const provenanceSchema = z.object({ url: z.string().url(), retrieved_at: isoDate, source_tool: z.string().optional(), title: z.string().optional(), artifact: z.string().optional(), excerpt:z.string().optional() });
export type Provenance = z.infer<typeof provenanceSchema>;

export const nodeSchema = z.object({ id: z.string(), label: z.string(), kind: z.enum(nodeKinds), blurb: z.string(), tags: z.array(z.string()), candidate: z.boolean().optional(), target: z.boolean().optional(), profiles: z.record(z.string()).optional(), nobel_prize: z.object({ category: z.string(), year: z.number().int(), motivation: z.string(), url: z.string().url() }).optional(), evidence_packet: z.object({ urls: z.array(z.string().url()), notes: z.string() }) });
export const edgeSchema = z.object({ source: z.string(), target: z.string(), strength: z.number().int().min(1).max(10), evidence: z.object({ claim: z.string(), basis: z.enum(bases), urls: z.array(z.string().url()), institutional_hop: z.boolean().optional(), confidence: z.enum(['high', 'medium', 'low']).optional(), reported_confidence: z.enum(['high', 'medium', 'low']).optional(), basis_detail: z.string().optional(), expansion_root: z.string().optional(), verification_notes: z.string().optional(), ego_gateway: z.boolean().optional(), attestation: z.enum(['user']).optional(), source_checks: z.array(z.object({ url: z.string().url(), status: z.number().nullable(), accessible: z.boolean(),checked_at:isoDate.optional() })).optional(),
  discovery: z.enum(['algorithmic', 'manual']).optional(), review_status: z.enum(['pending', 'reviewed', 'rejected']).optional(), review_method: z.enum(['owner', 'source_checks']).optional(), reviewed_at: isoDate.optional(), provenance: z.array(provenanceSchema).optional() }).passthrough() });
export const graphSchema = z.object({ nodes: z.array(nodeSchema), edges: z.array(edgeSchema) });
export type NodeRecord = z.infer<typeof nodeSchema>;
export type EdgeRecord = z.infer<typeof edgeSchema>;
export type GraphRecord = z.infer<typeof graphSchema>;

export const artifactMetaSchema = z.object({ id: z.string(), title: z.string(), ego: z.string(), created_at: isoDate, updated_at: isoDate, origin: z.enum(['seed', 'uploaded', 'created']) });
export const artifactSchema = z.object({ format: z.literal('network-artifact'), version: z.literal(1), meta: artifactMetaSchema, nodes: z.array(nodeSchema), edges: z.array(edgeSchema), rejected: z.array(z.object({ key: z.string(), from_label: z.string(), to_label: z.string(), basis: z.string(), rejected_at: isoDate })).optional() });
export type ArtifactMeta = z.infer<typeof artifactMetaSchema>;
export type Artifact = z.infer<typeof artifactSchema>;
