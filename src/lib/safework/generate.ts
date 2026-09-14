import runtimeKnowledge from './runtime-knowledge.json';


export const workPackSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'status', 'job_description', 'job_address', 'workforce', 'scope', 'pack_requirements', 'assumptions', 'pre_start_confirmations', 'work_sequence', 'risk_assessment', 'coshh_assessments', 'plant_and_tools', 'materials_and_substances', 'ppe_and_rpe', 'permits_and_authorisations', 'competence_and_briefing', 'emergency_arrangements', 'environmental_controls', 'completion_and_handover', 'sources', 'review_warning'],
  properties: {
    title: { type: 'string' }, status: { type: 'string' }, job_description: { type: 'string' }, job_address: { type: 'string' }, workforce: { type: 'string' }, scope: { type: 'string' },
    pack_requirements: { type: 'object', additionalProperties: false, required: ['excavation', 'electrical', 'traffic_management', 'lifting_operation', 'work_at_height', 'hot_work', 'multi_shift', 'heating_boiler', 'coshh', 'domestic_rewire'], properties: { excavation: { type: 'boolean' }, electrical: { type: 'boolean' }, traffic_management: { type: 'boolean' }, lifting_operation: { type: 'boolean' }, work_at_height: { type: 'boolean' }, hot_work: { type: 'boolean' }, multi_shift: { type: 'boolean' }, heating_boiler: { type: 'boolean' }, coshh: { type: 'boolean' }, domestic_rewire: { type: 'boolean' } } },
    assumptions: { type: 'array', items: { type: 'string' } },
    pre_start_confirmations: { type: 'array', items: { type: 'string' } },
    work_sequence: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['step', 'activity', 'controls'], properties: { step: { type: 'integer' }, activity: { type: 'string' }, controls: { type: 'array', items: { type: 'string' } } } } },
    risk_assessment: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['hazard', 'people_at_risk', 'possible_harm', 'initial_risk', 'controls', 'residual_risk'], properties: { hazard: { type: 'string' }, people_at_risk: { type: 'string' }, possible_harm: { type: 'string' }, initial_risk: { type: 'string' }, controls: { type: 'array', items: { type: 'string' } }, residual_risk: { type: 'string' } } } },
    coshh_assessments: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['product_or_process', 'task_and_exposure', 'health_hazards', 'people_at_risk', 'controls', 'ppe_rpe', 'sds_wel_monitoring', 'emergency_first_aid', 'storage_disposal', 'review_requirements'], properties: { product_or_process: { type: 'string' }, task_and_exposure: { type: 'string' }, health_hazards: { type: 'string' }, people_at_risk: { type: 'string' }, controls: { type: 'array', items: { type: 'string' } }, ppe_rpe: { type: 'string' }, sds_wel_monitoring: { type: 'string' }, emergency_first_aid: { type: 'string' }, storage_disposal: { type: 'string' }, review_requirements: { type: 'string' } } } },
    plant_and_tools: { type: 'array', items: { type: 'string' } }, materials_and_substances: { type: 'array', items: { type: 'string' } }, ppe_and_rpe: { type: 'array', items: { type: 'string' } }, permits_and_authorisations: { type: 'array', items: { type: 'string' } }, competence_and_briefing: { type: 'array', items: { type: 'string' } }, emergency_arrangements: { type: 'array', items: { type: 'string' } }, environmental_controls: { type: 'array', items: { type: 'string' } }, completion_and_handover: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'url'], properties: { title: { type: 'string' }, url: { type: 'string' } } } },
    review_warning: { type: 'string' },
  },
} as const;

export async function generatePack(request: Request, apiKey: string, model: string) {
  const connection = { key: apiKey };
  if (!connection) return Response.json({ message: 'Connect OpenAI in Settings before generating a work pack.' }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { description?: string; address?: string };
  const description = body.description?.trim() || '';
  const address = body.address?.trim() || '';
  if (description.length < 8 || address.length < 5) return Response.json({ message: 'Enter the job description and job address.' }, { status: 400 });
  if (description.length > 20000) return Response.json({ message: 'The combined job details must be 20,000 characters or fewer.' }, { status: 400 });
  if (address.length > 500) return Response.json({ message: 'The job address must be 500 characters or fewer.' }, { status: 400 });

  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal: AbortSignal.timeout(180000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.key}` },
    body: JSON.stringify({
      model: model,
      store: false,
      instructions: `You are SafeWork AI creating a UK workplace health and safety DRAFT WORK PACK from only a job description and address.

Preserve confirmed facts from the user description throughout the pack: workforce number, materials, tools, occupancy, access restrictions and forecast weather. Treat the labelled CONFIRMED PLANNING ANSWERS as customer-supplied facts and apply them throughout the pack. Populate workforce with the explicitly supplied number and roles. Do not replace supplied facts with unknowns, assume extra workers, or add unrelated methods such as metal grinding to a timber-only job. If staffing may be inadequate, give a concise advisory to review the allocation before that activity rather than inventing extra staff.

Order controls by their prerequisites. Establish public segregation and temporary boundary security BEFORE deliveries affecting pedestrians, trial holes or intrusive work. Complete service planning, locating checks, marking and excavation authorisation BEFORE pulling out old posts, removing foundations, breaking ground or digging trial holes. Trial holes are controlled excavation, not a way to bypass the pre-start checks. Confirm exposed service positions using the agreed safe method before subsequent excavation. Put these prerequisites explicitly in the relevant numbered steps, not only in the pre-start list. Preserve temporary boundary security throughout breaks, curing and handover.

For wood dust, identify occupational asthma; hardwood dust also carries a nasal-cancer risk, without assuming the timber is hardwood. Confirm timber and treatment type. Specify suitable on-tool extraction for dust-generating cutting/sanding where applicable, minimisation of cutting, segregation and vacuum/wet cleanup before relying on RPE. Do not treat absence of visible dust or symptoms as evidence of safe exposure. Assess exposure and health-surveillance needs against current HSE guidance.

Where tight-fitting RPE is selected, explicitly require a competent face-fit test for the individual wearer and selected make/model/size, a fit check each time worn, no facial hair or other interference at the seal, compatibility with other PPE, training, maintenance and replacement. If an adequate seal cannot be achieved, select suitable alternative RPE, such as an appropriately selected loose-fitting powered hood, through competent assessment. Include these requirements in PPE/RPE and relevant COSHH entries, not solely in background knowledge.

Infer the conventional end-to-end work sequence from the description. Do not ask questions and do not require the user to list normal trade steps. Use the complete SafeWork knowledge to produce a practical pack covering the whole lifecycle: planning and permissions; site setup and public protection; surveys and service checks; deliveries; plant, tools and materials; the main work sequence; inspections and tests; reinstatement, waste and handover.

Keep the structured pack complete but concise so it can be generated reliably: use 8-12 work-sequence steps, 8-12 risk-assessment rows, 3-5 short controls per step or hazard, and 3-8 items in each supporting list. Combine closely related hazards instead of repeating them. Every required JSON field must be completed and the response must end with valid JSON.

Anything that still cannot safely be known must be recorded briefly as an assumption or advisory check. Do not use the phrase HOLD POINT and do not tell the customer to obtain a replacement work pack. Present safety-critical prerequisites within the relevant work-sequence step and permit or inspection records, using clear wording such as "confirm before this activity". Never invent dimensions, service clearance, ground conditions, asbestos status, isolation, competence, permits, design approval, plant selection, substances, access arrangements or welfare. A generated permit is a form to be issued by the authorised person, not evidence that permission already exists. Apply the hierarchy of control; PPE must not replace higher-order controls. Risk ratings are provisional and must state the assumed scoring basis in plain language. Cite only relevant official sources contained in the supplied knowledge. The pack must require competent-person review, amendment for actual site conditions, workforce briefing and authorisation before work begins.

Classify the job in pack_requirements so the app can attach the correct forms. For highway, street-lighting or roadside work, explicitly address the exact location and asset ID, dutyholders/asset owner, approved signing-lighting-guarding layout, vulnerable pedestrians, temporary signals, night lighting/glare, staffing adequacy and shift handover. For electrical work, require identified supply ownership, safe isolation/lock-off/prove-dead records, test instrument identification, authorised persons, commissioning results and energisation authority. For lifting, require the verified load, centre of gravity/lifting points, lifting plan, equipment/accessory IDs and LOLER evidence, ground/outrigger position, exclusion zone, weather limits and lift team. For tall items, assess overhead lines and obstructions. For excavation, require service plans, locator equipment/calibration/function checks, marked survey, trial-hole record and permit close-out. Add conditional controls for work at height/MEWP rescue and hot cutting/fire watch. Multi-shift work must include overnight security and a recorded handover.

For a domestic property rewire, consumer-unit replacement or major domestic circuit installation, set domestic_rewire true. Confirm the UK jurisdiction and applicable Building Regulations/notification route; where applicable require the Part P/Building Control or registered competent-person route, Electrical Installation Certificate, schedules of inspections and test results, notification/compliance certificate reference and records of any departures. Require design and verification of supply characteristics, earthing, prospective fault current, bonding, load/diversity, protective devices, circuit schedule and special locations. Address structural limits for wall chases and holes/notches in joists, and inspection/restoration of fire, smoke, acoustic and weather-resisting service penetrations. Include an occupied-property daily handback check so no accessible live parts, unsecured boards, exposed conductors, lifted floors, unguarded chases or obstructed escape routes remain. Plan temporary supplies and portable tools using suitable reduced-voltage/cordless equipment where practicable, RCD protection where required, recorded pre-use/formal inspections and safe charging. Include specific loft and ceiling-void controls for access, lighting, fragile ceilings, insulation, heat, dust, nails, restricted movement and rescue. Segregate electrical and electronic waste, lamps, alarms, batteries, cable, metals, packaging and hazardous components, with carrier/destination and waste-transfer or consignment evidence where required.

For any boiler, heating appliance or central-heating replacement, set heating_boiler true and do not assume the fuel. Require confirmation of appliance type, fuel (natural gas, LPG, oil, electric or other), domestic/commercial use, occupancy, boiler and flue specification, condensate and pressure-relief discharge routes, ventilation/combustion air, mounting and access, temporary loss of heating/hot water, water treatment, hazardous substances and waste arrangements. If gas work is involved, state unequivocally that work on the appliance and final connections must be carried out by a currently Gas Safe registered engineer whose ID, expiry and exact appliance/fuel categories have been checked; it cannot be installed by an unregistered person and signed off later. Require recorded tightness/leak testing, purging where applicable, flue integrity, analyser make/model/serial/calibration, combustion readings, safety-device checks, commissioning/Benchmark record, Building Regulations notification reference where applicable, CO alarm check, electrical certification reference, customer demonstration and handover signatures. Include the National Gas Emergency Service number 0800 111 999 for suspected gas leaks. If flue access is at height, require a suitable access and rescue assessment. If the fuel is not gas, do not apply Gas Safe requirements; identify the correct fuel-specific competence and commissioning requirements as an advisory check before the affected activity.

For substances hazardous to health and hazardous substances generated by the work, set coshh true and create one concise coshh_assessments entry for each reasonably foreseeable product class or generated exposure, up to five entries. Examples include cement, resin, paint, solvent, adhesive, sealant, flux, cleanser, inhibitor, fuel residues, welding fume, silica/wood dust and biological contamination. Do not invent a brand, composition, hazard statement, exposure limit or SDS detail. Where the exact product is unknown, name the product class and state that the actual product and current SDS must be checked before use. Each assessment must cover task/use and likely exposure routes; health effects; everyone exposed; elimination/substitution and engineering/work-practice controls before PPE; PPE/RPE; SDS, WEL, monitoring or health-surveillance needs; first aid/spill/emergency response; storage and disposal; and review triggers. A safety data sheet supports but does not replace the COSHH assessment. Do not treat asbestos or lead as ordinary COSHH entries when their separate specific regulations apply. If no COSHH-relevant substance or process is reasonably foreseeable, set coshh false and return an empty coshh_assessments array.

Do not show a residual risk as acceptable while it remains High. State the additional control or competent-person decision needed before the affected activity proceeds.

Use the supplied professional-language module naturally and accurately throughout the RAMS. Prefer precise terms where they clarify hazards, foreseeable harm, exposure, controls, competence, residual risk and review requirements. Do not add jargon for its own sake or use legal/enforcement terms unless the facts and applicable law support them.

Full SafeWork knowledge: ${JSON.stringify(runtimeKnowledge)}`,
      input: `JOB DESCRIPTION:\n${description}\n\nJOB ADDRESS:\n${address}`,
      max_output_tokens: 9000,
      reasoning: { effort: 'low' },
      text: { verbosity: 'low', format: { type: 'json_schema', name: 'safework_work_pack', strict: true, schema: workPackSchema } },
    }),
  });

  const data = await apiResponse.json() as { status?: string; incomplete_details?: { reason?: string }; output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
  if (!apiResponse.ok) return Response.json({ message: data.error?.message || 'The work pack could not be generated.' }, { status: apiResponse.status });
  if (data.status === 'incomplete') return Response.json({ message: data.incomplete_details?.reason === 'max_output_tokens' ? 'This job needs an unusually large pack. Shorten the description slightly and try again.' : 'The AI could not finish the work pack. Please try again.' }, { status: 502 });
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text || '').join('') || '';
  try { const workPack = JSON.parse(outputText); if (!validPack(workPackSchema, workPack)) throw new Error("Invalid pack"); return Response.json({ workPack }); }
  catch { return Response.json({ message: 'The AI returned an incomplete work pack. Please try again.' }, { status: 502 }); }
}

function validPack(schema: { type: string; properties?: object; items?: unknown; required?: readonly string[] }, value: unknown): boolean {
 if(schema.type==='string') return typeof value==='string' && value.length<=20000;
 if(schema.type==='boolean') return typeof value==='boolean';
 if(schema.type==='integer') return Number.isSafeInteger(value);
 if(schema.type==='array') return Array.isArray(value) && value.length<=100 && value.every(item=>validPack(schema.items as Parameters<typeof validPack>[0],item));
 if(schema.type==='object') return value!==null && typeof value==='object' && !Array.isArray(value) && Object.entries(schema.properties || {}).every(([key,child])=>validPack(child,(value as Record<string,unknown>)[key]));
 return false;
}
