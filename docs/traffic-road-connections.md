# Verify actual road connections before classifying junction conflicts

The drawing analyser now receives the selected viewport plus a second road-map/aerial view at exactly the same centre and zoom. If the comparison provider request fails, that limitation is supplied to the model and reported to the user. This normally adds one Static Maps image request and one AI image input per drawing request.

Each observed feature must identify its connection type (join, exit, grade-separated crossing, separate road, opposite carriageway or uncertain), its impact on the proposed layout and visible evidence. The prompt requires physical connectivity rather than proximity or a 2D line intersection, distinguishes merges from diverges, and forbids inventing an image-edge connection. It also asks for the affected footprint rather than treating every visible road as part of the closure. An already-approved drawing reference is not a prerequisite to begin authoring a draft.

When the current numeric profile can be calculated, its first/last equipment chainages and the map scale are passed to the AI as context. When dimensions prevent that calculation, the footprint is explicitly unavailable; the model must not claim that a nearby road is certainly within it.

A feature reported as grade-separated/separate/opposite-carriageway does not itself trigger the affected-junction gate. A genuine or uncertain relevant connection, explicit complex-site selection, user-marked review point, overall uncertainty or missing essential information still requires review. Existing geometry/profile scope is unchanged. This reduces one cause of false-positive warnings; it does not prove live vision classifications correct.

The existing UI displays the feature evidence as observations. Width errors include the entered per-lane values so users can locate input mistakes without changing real measurements to satisfy a profile.

Validation uses mocked image/AI responses to check dual-view input, non-blocking separated roads, retained review for real/uncertain connections, numerical footprint context and width messages. No live vision-quality claim is made, and the supplied screenshots are not republished or embedded in the prompt.
