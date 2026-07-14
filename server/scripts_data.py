"""Prompt scripts for the guided voice-recording tool.

Categories are ordered roughly by how they build on each other: read naturally
first, then drill emphasis/prosody explicitly, then loosen into more
conversational, less "read aloud" phrasing. Total read-through time targets
~50-70 minutes, in line with what a Chatterbox fine-tune needs to pick up
rhythm and inflection (not just timbre, which needs far less).
"""

NEUTRAL_NARRATION = [
    {
        "id": "narr_short_1",
        "instructions": "Read at a relaxed, natural pace, like narrating a documentary.",
        "text": (
            "The lighthouse stood at the edge of the cliff, its beam sweeping "
            "slowly across the dark water below."
        ),
    },
    {
        "id": "narr_short_2",
        "instructions": "Same relaxed pace as before.",
        "text": (
            "By the time the kettle whistled, the rain had already soaked "
            "through every corner of the garden."
        ),
    },
    {
        "id": "narr_medium_1",
        "instructions": "Read this as if explaining something interesting to a friend.",
        "text": (
            "Most people assume that the fastest route between two points is "
            "always a straight line, but on a curved surface like the Earth, "
            "that isn't quite true. Pilots and sailors have known this for "
            "centuries, which is why long-haul flights often trace a path "
            "that looks curved on a flat map, even though it's actually the "
            "shortest way to get there."
        ),
    },
    {
        "id": "narr_medium_2",
        "instructions": "Keep a steady, informative tone, like a museum audio guide.",
        "text": (
            "The recipe called for exactly three ingredients, which seemed "
            "far too simple to produce anything worth eating. And yet, when "
            "combined in the right order and given enough time to rest, they "
            "transformed into something far greater than the sum of their "
            "parts. Cooking, it turns out, is often more about patience than "
            "about complexity."
        ),
    },
    {
        "id": "narr_long_1",
        "instructions": "Longer passage — read it as continuous, flowing narration, not sentence by sentence.",
        "text": (
            "When the old bridge finally closed for repairs, the town had to "
            "relearn how to get from one side of the river to the other. For "
            "years, everyone had simply assumed the bridge would always be "
            "there, a fixed point they never had to think about. Now, "
            "delivery trucks took the long way around through the valley, "
            "students biked an extra twenty minutes to school, and the "
            "morning commute stretched from fifteen minutes to nearly an "
            "hour. Strangely, though, people started talking to their "
            "neighbors more. Waiting at the temporary ferry crossing gave "
            "them time they didn't know they had, and slowly, the "
            "inconvenience turned into something like a ritual. By the time "
            "the bridge reopened, a few people almost missed the detour."
        ),
    },
]

EMPHASIS_SETS = [
    {
        "id": "emph_1",
        "base_text": "I didn't say she took the money.",
        "variants": [
            "**I** didn't say she took the money.",
            "I **didn't** say she took the money.",
            "I didn't **say** she took the money.",
            "I didn't say **she** took the money.",
            "I didn't say she **took** the money.",
            "I didn't say she took **the money**.",
        ],
        "instructions": (
            "Read the same sentence six times, stressing only the bolded word "
            "each time. The meaning should noticeably shift each time."
        ),
    },
    {
        "id": "emph_2",
        "base_text": "We are leaving on Friday.",
        "variants": [
            "**We** are leaving on Friday.",
            "We are **leaving** on Friday.",
            "We are leaving on **Friday**.",
        ],
        "instructions": "Stress only the bolded word each time.",
    },
    {
        "id": "emph_3",
        "base_text": "That is the best idea I've heard all week.",
        "variants": [
            "That is the **best** idea I've heard all week.",
            "That is the best idea I've heard **all week**.",
        ],
        "instructions": "Stress only the bolded phrase each time.",
    },
]

QUESTIONS_EXCLAMATIONS = [
    {"id": "q_1", "text": "Are you coming with us or not?"},
    {"id": "q_2", "text": "Wait, you did what?"},
    {"id": "q_3", "text": "How on earth did you fix that so quickly?"},
    {"id": "q_4", "text": "Is this seat taken?"},
    {"id": "q_5", "text": "You're telling me it's already five o'clock?"},
    {"id": "e_1", "text": "That's absolutely incredible!"},
    {"id": "e_2", "text": "Watch out, it's going to fall!"},
    {"id": "e_3", "text": "No way, we actually won!"},
    {"id": "e_4", "text": "I can't believe I forgot my keys again."},
    {"id": "e_5", "text": "Oh, come on, you have got to be kidding me."},
]

CONVERSATIONAL_RHYTHM = [
    {
        "id": "conv_1",
        "instructions": (
            "Read naturally, letting the commas and dashes create real "
            "pauses — don't rush through the punctuation."
        ),
        "text": (
            "So here's the thing — I wasn't even planning to go, but then "
            "Sarah called, and, well, you know how she is, she can talk "
            "anyone into anything."
        ),
    },
    {
        "id": "conv_2",
        "instructions": "Natural conversational pacing, like telling a story to a friend.",
        "text": (
            "Honestly? I think it's going to rain later, but I packed an "
            "umbrella just in case, because last time I didn't, and, well, "
            "you remember how that went."
        ),
    },
    {
        "id": "conv_3",
        "instructions": "Let the parenthetical dip in tone slightly before returning to normal pace.",
        "text": (
            "The plan, as far as I understand it — and I could be wrong "
            "about this — is to leave early, grab breakfast on the way, and "
            "still make it there before the doors open."
        ),
    },
    {
        "id": "conv_4",
        "instructions": "Read like you're genuinely thinking it through as you speak.",
        "text": (
            "I mean, on one hand, it's a great opportunity. On the other "
            "hand, it means moving across the country, leaving everything "
            "familiar behind, and starting over from scratch."
        ),
    },
]

EXTENDED_NARRATION = [
    {
        "id": "ext_narr_1",
        "instructions": "Read this as continuous narration, like a nature documentary segment. Don't pause between sentences more than you naturally would.",
        "text": (
            "Deep beneath the surface of the ocean, far past the point where "
            "sunlight can reach, there exists an entire world that operates "
            "on completely different rules. Pressure here is immense, "
            "enough to crush an unprotected submarine like a paper cup, and "
            "yet life not only survives but thrives. Strange fish drift "
            "through the darkness with lights built into their own bodies, "
            "flashing patterns to attract prey or warn off predators. Some "
            "creatures have gone without sunlight for so many generations "
            "that they've lost their eyes entirely, relying instead on "
            "vibration and chemical traces in the water to navigate their "
            "surroundings. What's remarkable is how recently we've begun to "
            "understand any of this. Until submersibles capable of "
            "withstanding that kind of pressure were developed, most of "
            "this ecosystem was simply invisible to us, a vast portion of "
            "the planet we knew almost nothing about. Even now, scientists "
            "estimate we've mapped only a small fraction of the deep sea "
            "floor in any real detail, meaning there are almost certainly "
            "entire species, maybe entire ecosystems, that no human being "
            "has ever laid eyes on. It's a strange thought, that the "
            "least explored place on Earth isn't some remote mountain range "
            "or desert, but the water beneath the boats we sail every day."
        ),
    },
    {
        "id": "ext_narr_2",
        "instructions": "Continuous narration, informative but warm in tone.",
        "text": (
            "Before satellites and GPS, mapmaking was as much an act of "
            "storytelling as it was a science. Early cartographers filled "
            "the blank spaces at the edges of their maps with sea monsters "
            "and warnings, not necessarily because they believed monsters "
            "lived there, but because the alternative, an honest blank "
            "space, felt like admitting defeat. A map was supposed to be "
            "complete. As explorers pushed further into unfamiliar "
            "territory, mapmakers had to constantly revise their "
            "assumptions, sometimes redrawing entire coastlines based on a "
            "single sailor's account, which wasn't always reliable. Entire "
            "islands appeared on maps for centuries that never actually "
            "existed, born from a navigator's mistake or a deliberate "
            "fabrication, and then quietly vanished from later editions "
            "once someone finally sailed through where the island was "
            "supposed to be and found nothing but open water. It makes you "
            "wonder how much of what we now consider settled fact is really "
            "just the most recent version of an old guess, waiting for "
            "someone to sail a little further and prove it wrong."
        ),
    },
    {
        "id": "ext_narr_3",
        "instructions": "Continuous narration, slightly more upbeat and conversational tone.",
        "text": (
            "Coffee's journey around the world is a genuinely strange piece "
            "of history. It's believed to have originated in the "
            "highlands of Ethiopia, where, according to legend, a goat "
            "herder noticed his goats becoming unusually energetic after "
            "eating berries from a certain shrub. From there, it spread "
            "through the Arabian Peninsula, where it was initially embraced "
            "in religious contexts to help people stay awake through long "
            "nights of prayer. For a while, some authorities tried to ban "
            "it entirely, worried about the social effects of coffeehouses "
            "becoming places where people gathered to gossip, argue "
            "politics, and generally stir up trouble. Of course, the bans "
            "never really worked. By the time coffee reached Europe, it had "
            "already become deeply embedded in daily life, and European "
            "coffeehouses took on a similar role, becoming hubs where "
            "writers, scientists, and merchants exchanged ideas over a cup. "
            "Some historians even credit the coffeehouse culture of the "
            "seventeenth and eighteenth centuries with accelerating the "
            "spread of Enlightenment ideas, simply because they gave people "
            "a place to sit, think, and talk for hours without needing to "
            "buy round after round of alcohol. It's strange to think that a "
            "shrub from the Ethiopian highlands might have quietly shaped "
            "the intellectual history of an entire continent."
        ),
    },
    {
        "id": "ext_narr_4",
        "instructions": "Continuous narration, measured and thoughtful pace.",
        "text": (
            "There's something almost hypnotic about watching a suspension "
            "bridge being built. The cables are strung first, thin and "
            "almost delicate looking against the size of the towers "
            "holding them, and it seems impossible that something so "
            "slender could eventually support the weight of thousands of "
            "cars every single day. But the engineering behind it is "
            "surprisingly elegant. Rather than fighting against gravity, a "
            "suspension bridge works with it, letting the roadway hang from "
            "the cables so that the tension is distributed evenly along "
            "the entire span. The towers themselves are under enormous "
            "compressive force, essentially being squeezed from above, "
            "which is exactly what steel and concrete are good at "
            "resisting. It's a design that has barely changed in its basic "
            "principle for over a century, even as the bridges themselves "
            "have grown longer and more ambitious. Every time one of these "
            "bridges is finished, there's a strange moment where the last "
            "temporary supports are removed, and for the first time, the "
            "entire structure has to hold itself up using nothing but the "
            "physics its designers calculated years earlier on paper."
        ),
    },
    {
        "id": "ext_narr_5",
        "instructions": "Continuous narration, curious and engaged tone.",
        "text": (
            "Every autumn, without any calendar or clock to consult, "
            "millions of birds somehow know it's time to leave. Some "
            "species travel astonishing distances, crossing entire oceans "
            "in a single uninterrupted flight, navigating by a combination "
            "of the position of the stars, the earth's magnetic field, and "
            "landmarks passed down, in some sense, through generations of "
            "instinct rather than experience. A bird that has never made "
            "the journey before, having hatched only months earlier, can "
            "still find its way to a specific wintering ground thousands of "
            "miles away, one it has never seen. Scientists still don't "
            "fully understand every mechanism involved, though we've "
            "learned a great deal by attaching small trackers to "
            "individual birds and following their routes year after year. "
            "What's struck researchers most is how consistent these routes "
            "are, generation after generation, almost like an invisible "
            "highway in the sky that only the birds can see, etched into "
            "instinct rather than drawn on any map."
        ),
    },
    {
        "id": "ext_narr_6",
        "instructions": "Continuous narration, calm and steady tone, like a craft demonstration voiceover.",
        "text": (
            "Glassmaking is one of those crafts that looks almost like "
            "magic the first time you see it done in person. A lump of "
            "sand, essentially, is heated until it becomes a molten, "
            "glowing liquid, and then a glassblower gathers a small amount "
            "onto the end of a long metal pipe and begins to shape it "
            "purely through breath and rotation. Too little air and the "
            "piece stays dense and heavy. Too much, applied too quickly, "
            "and it can burst entirely. The timing matters just as much as "
            "the technique, because glass cools and stiffens as it's "
            "worked, meaning the craftsperson has only a narrow window "
            "before they need to reheat it in the furnace and start the "
            "next stage. What's remarkable is that this basic process has "
            "barely changed in thousands of years. Ancient glassmakers "
            "would recognize most of the tools and techniques used in a "
            "modern glassblowing studio today, even though nearly "
            "everything else about how we make things has been completely "
            "transformed by machinery and automation."
        ),
    },
    {
        "id": "ext_narr_7",
        "instructions": "Continuous narration, slightly more excited and animated tone.",
        "text": (
            "When radio waves were first discovered, nobody quite knew "
            "what to do with them. They were, initially, mostly a "
            "scientific curiosity, a strange invisible signal that could "
            "somehow pass through walls and travel through open air "
            "without any wire connecting the sender and receiver. It took "
            "years of experimentation before anyone figured out how to "
            "actually encode useful information onto those waves, and even "
            "longer before the technology became practical enough for "
            "everyday use. Early radio operators had to learn Morse code "
            "just to communicate anything at all, tapping out messages "
            "letter by letter across vast distances. It's easy to forget, "
            "listening to a radio station today, that this entire "
            "technology once felt as strange and futuristic as anything we "
            "consider cutting edge now. Every new form of communication "
            "seems to go through the same cycle: first dismissed as a "
            "novelty, then adopted by hobbyists and enthusiasts, and only "
            "much later does it become something ordinary enough that "
            "nobody thinks twice about it."
        ),
    },
    {
        "id": "ext_narr_8",
        "instructions": "Continuous narration, gentle and reflective tone.",
        "text": (
            "Before electronic clocks existed, an entire industry of "
            "craftsmen dedicated their lives to building mechanisms that "
            "could measure time using nothing but gears, springs, and "
            "gravity. A single mechanical clock might contain dozens of "
            "individually shaped components, each one cut and filed by "
            "hand to a precision that seems almost unbelievable given the "
            "tools available at the time. The pendulum clock, in "
            "particular, was a genuine breakthrough, because it relied on "
            "something remarkably consistent: the time it takes for a "
            "weight to swing back and forth barely changes regardless of "
            "how far it swings, as long as the arc stays relatively small. "
            "That discovery alone improved the accuracy of clocks "
            "dramatically almost overnight. Clockmakers became some of the "
            "most respected craftspeople of their era, and the skills "
            "required, precision metalwork, an understanding of "
            "mechanics, careful mathematics, later fed directly into other "
            "fields entirely, including the earliest scientific "
            "instruments and even early computing machines."
        ),
    },
    {
        "id": "ext_narr_9",
        "instructions": "Continuous narration, quiet, meditative tone.",
        "text": (
            "In certain traditions, the preparation of tea is treated less "
            "as a beverage to be made quickly and more as a deliberate, "
            "unhurried ritual. Every motion, from the way the water is "
            "poured to the way the cup is turned before it's offered, "
            "follows a specific order that has been refined and passed "
            "down over centuries. The point isn't really about the tea "
            "itself, or at least not only about the tea. It's about "
            "creating a small pocket of time where nothing else matters "
            "except the task directly in front of you. In a world that "
            "moves as quickly as ours does, there's something quietly "
            "radical about spending twenty minutes preparing a single cup "
            "of tea with complete attention, refusing to rush even when "
            "rushing would be easy. It's a reminder that slowness, done "
            "deliberately, isn't the same thing as wasted time."
        ),
    },
    {
        "id": "ext_narr_10",
        "instructions": "Continuous narration, warm storytelling tone, like closing out a documentary.",
        "text": (
            "It's easy to look at any finished thing, a bridge, a piece of "
            "music, a well-written book, and forget just how many failed "
            "attempts usually came before it. What we see is the polished "
            "result, but almost never the discarded drafts, the "
            "miscalculations, the versions that simply didn't work and had "
            "to be abandoned entirely. Most meaningful work is built this "
            "way, through a long process of trying something, noticing "
            "what's wrong with it, and adjusting, over and over, until "
            "eventually the rough edges disappear and what's left looks "
            "almost effortless. That illusion of effortlessness is, in a "
            "strange way, the whole point. It's what lets us enjoy the "
            "final bridge without thinking about the engineers who spent "
            "years testing failed designs, or enjoy a piece of music "
            "without hearing every abandoned melody that never made it "
            "into the final version. Maybe that's worth remembering the "
            "next time something we're working on feels unfinished and "
            "clumsy. It probably just means we're still somewhere in the "
            "middle of the process, not at the end of it."
        ),
    },
]

MORE_CONVERSATIONAL = [
    {
        "id": "conv_5",
        "instructions": "Natural conversational pacing, a little hesitant at first.",
        "text": (
            "I wasn't sure about it at first, if I'm being honest, but the "
            "more I thought about it, the more it actually made sense."
        ),
    },
    {
        "id": "conv_6",
        "instructions": "Read like you're recalling something slightly embarrassing but amused by it.",
        "text": (
            "So, funny story — I actually showed up a whole day early, "
            "stood there for a good five minutes before I realized nobody "
            "else was coming."
        ),
    },
    {
        "id": "conv_7",
        "instructions": "Natural pacing, slightly reassuring tone.",
        "text": (
            "Look, I get why you're worried, but honestly, it's going to "
            "be fine — we've handled worse than this before."
        ),
    },
    {
        "id": "conv_8",
        "instructions": "Let the list breathe — small pause after each item.",
        "text": (
            "We need to grab the tickets, figure out parking, and, "
            "somehow, convince your brother to actually be ready on time."
        ),
    },
    {
        "id": "conv_9",
        "instructions": "Natural conversational pacing, mild disbelief.",
        "text": (
            "Wait, hold on — you're telling me this whole time it was just "
            "unplugged?"
        ),
    },
    {
        "id": "conv_10",
        "instructions": "Warm, natural pacing, like wrapping up a phone call.",
        "text": (
            "Alright, I think that covers everything — talk to you "
            "tomorrow, and drive safe, okay?"
        ),
    },
]

MORE_EMPHASIS_SETS = [
    {
        "id": "emph_4",
        "base_text": "You said you'd call me yesterday.",
        "variants": [
            "**You** said you'd call me yesterday.",
            "You said you'd **call** me yesterday.",
            "You said you'd call **me** yesterday.",
            "You said you'd call me **yesterday**.",
        ],
        "instructions": "Stress only the bolded word each time; let the meaning shift accordingly.",
    },
    {
        "id": "emph_5",
        "base_text": "This is exactly what I was talking about.",
        "variants": [
            "This is **exactly** what I was talking about.",
            "This is exactly what **I** was talking about.",
            "This is exactly what I was **talking** about.",
        ],
        "instructions": "Stress only the bolded word each time.",
    },
]

MORE_QUESTIONS_EXCLAMATIONS = [
    {"id": "q_6", "text": "Did you really mean that, or were you joking?"},
    {"id": "q_7", "text": "What time does the last train leave?"},
    {"id": "q_8", "text": "Can you believe it's been a whole year already?"},
    {"id": "q_9", "text": "Why didn't anyone tell me sooner?"},
    {"id": "q_10", "text": "Isn't that exactly what we talked about last week?"},
    {"id": "e_6", "text": "Finally, some good news for once!"},
    {"id": "e_7", "text": "Careful, that plate is still hot!"},
    {"id": "e_8", "text": "Unbelievable — they actually pulled it off."},
    {"id": "e_9", "text": "I honestly can't thank you enough for this."},
    {"id": "e_10", "text": "Well, that escalated quickly."},
]

EXTENDED_NARRATION_2 = [
    {
        "id": "ext2_narr_1",
        "instructions": "Continuous narration, relaxed documentary tone.",
        "text": (
            "Before digital cameras existed, capturing an image was a "
            "genuinely chemical process, and a slow, unforgiving one at "
            "that. A photographer had only a limited number of frames on "
            "each roll of film, and there was no way to check whether a "
            "shot had actually worked until long after the moment had "
            "passed. That constraint shaped the whole craft. Photographers "
            "learned to anticipate a moment rather than react to it, "
            "pressing the shutter a fraction of a second before the peak "
            "of the action rather than during it, because the mechanism "
            "itself introduced a small delay. Once the roll was finished, "
            "it had to be developed in complete darkness, submerged in a "
            "sequence of chemical baths timed down to the second. Too long "
            "in the developer and the image would turn muddy and "
            "overexposed. Too short, and it would come out faint, almost "
            "ghostly, missing all its darker tones entirely. Printing the "
            "final image was its own separate skill, involving projecting "
            "light through the negative onto photographic paper, then "
            "again bathing that paper in its own sequence of chemicals. A "
            "skilled darkroom technician could subtly reshape an image "
            "during this stage, holding back light from one area while "
            "giving extra exposure to another, essentially sculpting the "
            "final print by hand. It's a slow, deliberate process compared "
            "to the instant feedback of a modern digital screen, and "
            "perhaps that's exactly why so many photographers still seek "
            "it out today, not for convenience, but for the discipline "
            "that comes from not being able to see your mistakes until "
            "it's already too late to fix them. There's something about "
            "that constraint that seems to sharpen attention rather than "
            "dull it, forcing a kind of patience that's increasingly rare "
            "in a world where everything else can be redone instantly."
        ),
    },
    {
        "id": "ext2_narr_2",
        "instructions": "Continuous narration, curious and slightly amazed tone.",
        "text": (
            "Ounce for ounce, spider silk is stronger than steel, and yet "
            "it's produced at room temperature inside a creature small "
            "enough to sit on a fingertip, using nothing but a diet of "
            "insects and a specialized gland. Engineers have spent decades "
            "trying to replicate the process artificially, and so far, "
            "none of them have managed to match it, which says something "
            "about just how sophisticated this small piece of natural "
            "machinery actually is. What makes silk so remarkable isn't "
            "just its raw strength, but its flexibility. A single strand "
            "can stretch significantly before breaking, absorbing the "
            "energy of an impact, which is exactly why a web can catch a "
            "flying insect without simply snapping on contact. Different "
            "spiders even produce different types of silk for different "
            "purposes within the same web, one variety for the structural "
            "framework, stiffer and less stretchy, and another, stickier "
            "and more elastic, for the spiral threads designed to trap "
            "prey. Researchers have tried everything from genetically "
            "modifying goats to produce silk proteins in their milk, to "
            "growing the relevant bacteria in giant vats, all in an "
            "attempt to produce this material at a scale useful for "
            "things like medical sutures or lightweight body armor. "
            "Progress has been made, but the spider itself remains, for "
            "now, the only reliable factory capable of producing silk with "
            "its full range of properties intact. It's a strange kind of "
            "humility, being reminded that a creature most people find "
            "unsettling has quietly out-engineered some of our most "
            "advanced laboratories."
        ),
    },
    {
        "id": "ext2_narr_3",
        "instructions": "Continuous narration, measured, slightly dramatic tone.",
        "text": (
            "When a volcano erupts, what we see on the surface is really "
            "just the final, brief chapter of a process that may have been "
            "building for decades underground. Molten rock, lighter than "
            "the solid material surrounding it, slowly rises through cracks "
            "in the earth's crust, sometimes pooling in vast underground "
            "chambers for years before finally finding a path to the "
            "surface. Pressure builds as gases trapped within that molten "
            "rock struggle to escape, and it's often this gas, rather than "
            "the rock itself, that determines how violent an eruption will "
            "be. A slow, gentle release lets lava flow out relatively "
            "calmly, creeping across the landscape at a walking pace. But "
            "when the gas can't escape gradually, pressure builds until it "
            "releases all at once, sometimes with enough force to level "
            "forests for miles around and send ash plumes high enough to "
            "circle the entire planet. Geologists monitor active volcanoes "
            "constantly, watching for subtle signs that something is "
            "changing underground long before any eruption becomes "
            "visible: small earthquakes too faint for people to feel, "
            "slight swelling of the ground as magma pushes upward, shifts "
            "in the gases seeping out of vents. None of these signs can "
            "predict an eruption with certainty, but together they give "
            "researchers a rough sense of how much pressure is building "
            "beneath the surface. It's a humbling reminder that the ground "
            "beneath our feet, which feels so permanent and solid, is "
            "really just a thin, temporary crust floating on something "
            "far less stable."
        ),
    },
    {
        "id": "ext2_narr_4",
        "instructions": "Continuous narration, warm storytelling tone.",
        "text": (
            "For centuries, the network of trade routes connecting East "
            "Asia to the Mediterranean carried far more than silk, despite "
            "the name history eventually gave it. Spices, precious "
            "stones, paper, gunpowder, and countless ideas traveled "
            "alongside the fabric that made the route famous, passed from "
            "merchant to merchant across thousands of miles, rarely "
            "traveling the entire distance with a single trader. Instead, "
            "goods moved in relays, changing hands at bustling trading "
            "cities along the way, each city adding its own markup and its "
            "own local flavor to whatever passed through. Along with "
            "goods, though, came something less tangible but perhaps more "
            "significant: religions, artistic styles, scientific "
            "knowledge, and languages all spread along these same paths, "
            "carried by the same merchants and travelers moving between "
            "distant cultures. A craftsman in one city might unknowingly "
            "adopt a technique that originated thousands of miles away, "
            "passed along through a chain of intermediaries none of whom "
            "ever met each other directly. It's tempting to think of "
            "history as a series of separate, isolated civilizations, but "
            "routes like this one reveal something closer to a slow, "
            "constant conversation stretching across continents, one that "
            "shaped nearly every culture it touched in ways that are still "
            "visible today, even if the original connections have long "
            "since been forgotten by most people living along what remains "
            "of the route."
        ),
    },
    {
        "id": "ext2_narr_5",
        "instructions": "Continuous narration, thoughtful, slightly reflective tone.",
        "text": (
            "It's easy to take paper for granted, given how disposable it "
            "feels in everyday life, but its invention was genuinely "
            "transformative. Before paper became widely available, "
            "recording information meant writing on materials that were "
            "either extremely expensive, like parchment made from animal "
            "skin, or bulky and impractical, like clay tablets or bamboo "
            "strips bound together. Paper changed the economics of writing "
            "entirely. It could be produced relatively cheaply from plant "
            "fibers, pressed and dried into thin, lightweight sheets that "
            "were far easier to store, transport, and produce in large "
            "quantities. This shift didn't just make existing activities "
            "easier, it made entirely new activities possible. Widespread "
            "record keeping, more accessible education, the eventual "
            "explosion of printed books once printing technology caught "
            "up, all of it depended on having a material that could be "
            "manufactured cheaply and in bulk. It took centuries for "
            "papermaking techniques to spread from where they originated "
            "to the rest of the world, carried gradually along the same "
            "trade routes that carried silk and spices, each region "
            "adapting the process slightly using whatever plant fibers "
            "were locally available. It's strange to think that something "
            "as ordinary as a sheet of paper, the kind most people barely "
            "notice anymore, was once a closely guarded technological "
            "secret, valuable enough that entire cities grew wealthy "
            "simply by controlling how it was made."
        ),
    },
    {
        "id": "ext2_narr_6",
        "instructions": "Continuous narration, gentle and appreciative tone.",
        "text": (
            "A surprising amount of the food we eat every day exists only "
            "because of a partnership between plants and insects that "
            "neither side entered into deliberately. Flowers evolved "
            "bright colors and sweet nectar specifically to attract "
            "pollinators, and in exchange for that reward, bees and other "
            "insects unknowingly carry pollen from one flower to the "
            "next, allowing plants to reproduce. Without this exchange, "
            "many of the fruits and vegetables that fill a grocery store "
            "simply wouldn't exist in anything like their current "
            "abundance. A single bee colony can visit an extraordinary "
            "number of flowers in just one day, and the efficiency of this "
            "system is honestly staggering when you consider that no "
            "individual bee has any awareness of the role it's playing in "
            "an entire agricultural ecosystem. It's simply following "
            "nectar, and the pollination happens as an incidental "
            "byproduct of that pursuit. In recent decades, declining bee "
            "populations have become a serious concern precisely because "
            "so much of our food supply quietly depends on this "
            "relationship continuing uninterrupted. Farmers in some "
            "regions have even resorted to pollinating certain crops by "
            "hand, using small brushes to transfer pollen flower by "
            "flower, a painstakingly slow substitute for a service bees "
            "used to provide for free. It's a vivid reminder of how much "
            "of our food system rests on relationships we rarely think "
            "about, built on the small, repetitive labor of creatures most "
            "people only notice when they're being swatted away from a "
            "picnic table."
        ),
    },
    {
        "id": "ext2_narr_7",
        "instructions": "Continuous narration, adventurous, slightly awed tone.",
        "text": (
            "Climbing the world's tallest mountains was, for most of "
            "human history, considered simply impossible, not because "
            "nobody wanted to try, but because the conditions at extreme "
            "altitude are hostile enough to kill even well-prepared "
            "climbers within hours. The air at the summit of the tallest "
            "peaks contains roughly a third of the oxygen available at "
            "sea level, which means the human body, deprived of enough "
            "oxygen to function normally, begins to shut down in "
            "increasingly serious ways the longer a climber stays there. "
            "Early expeditions treated the mountain almost like a military "
            "campaign, establishing a series of camps at increasing "
            "altitude, each one used to acclimatize before pushing higher, "
            "sometimes over the course of many weeks. Even with modern "
            "equipment and detailed weather forecasting, the margin for "
            "error near the summit remains extremely thin. A storm that "
            "arrives even a few hours earlier than predicted can strand "
            "climbers in conditions that offer almost no chance of "
            "survival. What's striking is how much of mountaineering "
            "success has less to do with physical strength and more to do "
            "with judgment: knowing when to turn back, even after weeks of "
            "preparation and mere hours from the summit, is often "
            "considered the single hardest decision a climber ever has to "
            "make, and the ones who survive long careers in the "
            "mountains are almost always the ones willing to make that "
            "call."
        ),
    },
    {
        "id": "ext2_narr_8",
        "instructions": "Continuous narration, quiet wonder, like describing something beautiful.",
        "text": (
            "The shifting curtains of light that appear in the night sky "
            "near the polar regions are the result of something happening "
            "far above the atmosphere most of us are familiar with. "
            "Charged particles, carried outward from the sun on a "
            "constant stream of solar wind, eventually collide with the "
            "earth's magnetic field, which funnels many of them toward "
            "the poles. As these particles slam into gas molecules high in "
            "the atmosphere, they release energy in the form of light, "
            "and the specific color produced depends on which gas is "
            "involved and at what altitude the collision occurs. Oxygen "
            "tends to produce the green and red tones most commonly "
            "associated with these displays, while nitrogen can produce "
            "shades of blue and purple. What makes the display so "
            "unpredictable is that it depends entirely on the intensity of "
            "the solar wind at any given moment, which fluctuates "
            "constantly based on activity happening on the surface of the "
            "sun itself, ninety-three million miles away. A particularly "
            "strong solar event can push the visible range of the display "
            "much further from the poles than usual, occasionally making "
            "it visible in places that almost never see it. For centuries, "
            "cultures living close enough to witness this regularly "
            "developed their own explanations for it, long before anyone "
            "understood the underlying physics, and even now, with the "
            "mechanism fully explained, standing underneath it rarely "
            "feels like a scientific experience. It still mostly just "
            "feels like witnessing something quietly impossible."
        ),
    },
    {
        "id": "ext2_narr_9",
        "instructions": "Continuous narration, informative but easygoing tone.",
        "text": (
            "Almost everyone who uses the internet assumes their data "
            "travels invisibly through the air, bouncing between "
            "satellites somewhere far overhead. In reality, the vast "
            "majority of international internet traffic travels through "
            "cables laid along the ocean floor, thin bundles of glass "
            "fiber no thicker than a garden hose, stretching across "
            "entire ocean basins to connect continents directly. These "
            "cables carry data as pulses of light rather than electricity, "
            "which allows information to travel at close to the speed of "
            "light itself, and a single modern cable can carry an "
            "enormous volume of traffic simultaneously. Laying these "
            "cables is an extraordinary logistical challenge, involving "
            "specialized ships that slowly unspool cable along a "
            "carefully surveyed path on the seafloor, avoiding "
            "underwater canyons, shipping lanes, and areas prone to "
            "seismic activity wherever possible. Despite those "
            "precautions, cables are damaged fairly regularly, sometimes "
            "by ship anchors, sometimes by underwater landslides, and "
            "repairing one means sending a specialized ship to the exact "
            "location, hauling the damaged section up from the ocean "
            "floor, splicing in a new segment, and lowering it all back "
            "down, a process that can take days even under good "
            "conditions. It's a strange thought that something as "
            "seemingly modern and weightless as sending a message across "
            "the planet still depends, physically, on a network of cables "
            "resting quietly on the ocean floor, largely unnoticed by the "
            "billions of people relying on them every single day."
        ),
    },
    {
        "id": "ext2_narr_10",
        "instructions": "Continuous narration, warm, closing tone, like the end of a documentary series.",
        "text": (
            "Bread, in its simplest form, requires only flour, water, and "
            "salt, and yet the process of turning those three ingredients "
            "into something worth eating relies on an invisible workforce "
            "of microorganisms doing most of the actual labor. Wild yeast, "
            "present naturally in flour and in the air itself, begins "
            "consuming the sugars in the dough and releasing carbon "
            "dioxide as a byproduct, which is exactly what causes the "
            "dough to rise. Alongside the yeast, certain bacteria produce "
            "small amounts of acid, which is what gives naturally "
            "fermented bread its distinctive tang. Bakers who maintain a "
            "sourdough starter are, in effect, cultivating a living "
            "ecosystem, feeding it regularly to keep the yeast and "
            "bacteria active and balanced, and that same starter, cared "
            "for properly, can be kept alive and used for generations, "
            "passed down like a family heirloom. What's remarkable is how "
            "sensitive the whole process is to its environment. The same "
            "starter can behave differently depending on the humidity in "
            "the kitchen, the temperature of the room, even the specific "
            "wild yeast strains present in that particular location, which "
            "is why a sourdough starter carried from one city to another "
            "will often develop a noticeably different flavor over time, "
            "shaped by its new surroundings. In a strange way, each loaf "
            "carries a small, edible record of the place where it was "
            "made, shaped by microorganisms too small to see but "
            "impossible to leave out of the process entirely."
        ),
    },
]

EXTENDED_NARRATION_3 = [
    {
        "id": "ext3_narr_1",
        "instructions": "Continuous narration, thoughtful, slightly awed tone.",
        "text": (
            "Before the printing press, every single copy of a book had "
            "to be produced entirely by hand, one page at a time, by a "
            "scribe who might spend months on a single manuscript. "
            "Mistakes were common and, once written, nearly impossible to "
            "correct without starting the page over, which meant books "
            "were rare, expensive, and often riddled with small "
            "variations from one copy to the next, since no two scribes "
            "worked identically. The printing press changed the "
            "fundamental economics of information almost overnight. "
            "Instead of copying a text by hand, a printer arranged small "
            "individual metal letters into the shape of a page, inked "
            "them, and pressed that same arrangement onto sheet after "
            "sheet of paper, producing dozens or even hundreds of "
            "identical copies in the time it once took to produce one. "
            "For the first time, an idea written down in one city could "
            "spread to thousands of readers across an entire continent "
            "within a matter of months rather than decades. This had "
            "consequences far beyond literature. Scientific findings could "
            "be verified and built upon by people who had never met the "
            "original researcher. Religious texts, once controlled "
            "tightly by institutions with the resources to produce them, "
            "became available to ordinary people who could now read and "
            "interpret them for themselves, a shift that contributed "
            "directly to major religious and political upheavals in the "
            "centuries that followed. It's hard to think of many "
            "inventions that reshaped the flow of human knowledge as "
            "thoroughly as a machine built essentially to stamp ink onto "
            "paper, over and over, exactly the same way each time."
        ),
    },
    {
        "id": "ext3_narr_2",
        "instructions": "Continuous narration, vivid, slightly wondrous tone.",
        "text": (
            "A coral reef looks, at first glance, like a colorful "
            "underwater rock formation, but it's actually built almost "
            "entirely by tiny living animals working together across "
            "countless generations. Each individual coral polyp is "
            "soft-bodied and small, barely visible without close "
            "inspection, but it secretes a hard limestone skeleton "
            "beneath itself for protection. As new polyps grow on top of "
            "the skeletons left behind by earlier generations, the "
            "structure slowly builds upward and outward, sometimes over "
            "thousands of years, eventually forming reefs large enough to "
            "be seen from space. What makes coral especially remarkable "
            "is its close partnership with a type of algae that lives "
            "directly inside its tissue, providing the coral with food "
            "through photosynthesis in exchange for shelter and access to "
            "sunlight. This relationship is also the reef's greatest "
            "vulnerability. When water temperatures rise even slightly "
            "above normal for an extended period, coral becomes stressed "
            "and expels the algae living inside it, leaving behind a "
            "stark white skeleton in a process known as bleaching. A "
            "bleached reef isn't necessarily dead, but it's in serious "
            "danger, and if conditions don't improve quickly enough, it "
            "can collapse entirely, taking with it the enormous community "
            "of fish and other creatures that depend on the reef's "
            "structure for shelter and food. A reef that took millennia "
            "to build can be devastated within a single unusually warm "
            "summer, which is part of why so many marine biologists treat "
            "reef health as an early warning sign for the health of the "
            "ocean more broadly."
        ),
    },
    {
        "id": "ext3_narr_3",
        "instructions": "Continuous narration, quiet wonder, like watching a night sky.",
        "text": (
            "A meteor shower isn't really about meteors falling from "
            "space at random, but about the earth passing through debris "
            "left behind by a comet that swung through the same region of "
            "space, sometimes centuries earlier. As a comet travels close "
            "to the sun, some of its icy surface vaporizes, releasing a "
            "trail of dust and small rocky fragments that continue "
            "drifting along roughly the same orbital path long after the "
            "comet itself has moved on. When the earth's own orbit "
            "crosses through one of these debris trails, which happens on "
            "a predictable schedule every year, those tiny fragments enter "
            "the atmosphere at extremely high speed and burn up, creating "
            "the brief streaks of light we call shooting stars. Most of "
            "these fragments are no larger than a grain of sand, and yet "
            "the speed at which they're traveling, often tens of "
            "thousands of miles per hour, is more than enough to generate "
            "a visible flash of light as they're destroyed by friction "
            "with the atmosphere. Because the timing depends on the "
            "earth's position relative to a specific debris trail, "
            "astronomers can predict meteor showers years in advance with "
            "remarkable precision, down to the specific night and even "
            "the general direction in the sky to look. What's easy to "
            "forget while watching one is that every streak of light "
            "represents a tiny piece of debris that may have been drifting "
            "silently through space for centuries, following the same "
            "invisible path, waiting for one specific night to finally "
            "meet the earth's atmosphere."
        ),
    },
    {
        "id": "ext3_narr_4",
        "instructions": "Continuous narration, informative, slightly wry tone.",
        "text": (
            "For most of human history, salt was one of the most valuable "
            "commodities in the world, not for flavor, but for survival. "
            "Before refrigeration existed, salt was one of the only "
            "reliable ways to preserve meat and fish long enough to "
            "survive winter or a long sea voyage, drawing moisture out of "
            "food and creating an environment where bacteria struggled to "
            "grow. Entire trade networks and even city economies were "
            "built specifically around salt production and distribution, "
            "and access to a reliable salt supply could determine whether "
            "a region could support an army, a fleet, or simply a "
            "population large enough to survive a difficult season. Some "
            "ancient roads were built primarily to transport salt from "
            "mines or coastal evaporation ponds to inland cities, and "
            "salt was, at various points in history, valuable enough to "
            "be used directly as currency or even as part of a soldier's "
            "wages. Wars were fought over control of particularly "
            "productive salt sources, and taxes on salt were common enough "
            "to trigger genuine political unrest when they became too "
            "burdensome for ordinary people to bear. It's a strange "
            "thing to consider while absentmindedly shaking salt onto a "
            "meal today, that this small, inexpensive mineral once shaped "
            "trade routes, funded armies, and occasionally toppled "
            "governments, simply because it was the only thing standing "
            "between a community and spoiled food."
        ),
    },
    {
        "id": "ext3_narr_5",
        "instructions": "Continuous narration, reflective, closing tone.",
        "text": (
            "Deep inside certain caves, far past the point where any "
            "natural light reaches, there are paintings that have "
            "survived for tens of thousands of years, created by people "
            "whose names and languages have been lost entirely. Using "
            "little more than charcoal, mineral pigments, and their own "
            "hands as tools, these early artists depicted animals with a "
            "level of anatomical detail and a sense of motion that still "
            "impresses artists today, capturing the exact curve of a "
            "running horse or the tension in the shoulders of a charging "
            "bison. Nobody knows for certain why these images were "
            "created so far inside caves, in chambers that would have "
            "required carrying fire deep underground just to see the "
            "work at all, far from any evidence of daily living. Some "
            "researchers believe the locations held ceremonial or "
            "spiritual significance, while others suggest the paintings "
            "were tied to hunting rituals, an attempt to influence the "
            "success of a future hunt through the image itself. What's "
            "striking is how deliberately composed many of these paintings "
            "are, using the natural curves and bulges of the cave wall to "
            "give the animals a sense of three-dimensional form, "
            "suggesting a level of artistic intention rather than casual "
            "doodling. Standing in front of one of these paintings today, "
            "separated from its creator by hundreds of centuries, there's "
            "an odd and powerful sense of direct connection, a reminder "
            "that the impulse to create something lasting, something "
            "meant to be seen, is apparently as old as humanity itself."
        ),
    },
]

NATURAL_AND_FAST_SPEECH = [
    {
        "id": "twister_1",
        "instructions": (
            "Read this tongue twister at your natural, comfortable speed — "
            "don't slow down for accuracy. If you stumble, just keep going "
            "or restart, whatever feels natural."
        ),
        "text": "Peter Piper picked a peck of pickled peppers.",
    },
    {
        "id": "twister_2",
        "instructions": "Same idea — natural speed, don't over-enunciate.",
        "text": "She sells seashells by the seashore, and the shells she sells are seashells, I'm sure.",
    },
    {
        "id": "twister_3",
        "instructions": "Read this one as fast as you comfortably can, like you're racing through it.",
        "text": "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
    },
    {
        "id": "twister_4",
        "instructions": "Fast and natural — don't worry about perfect clarity.",
        "text": "Fuzzy Wuzzy was a bear, Fuzzy Wuzzy had no hair, Fuzzy Wuzzy wasn't very fuzzy, was he?",
    },
    {
        "id": "fast_read_1",
        "instructions": (
            "Read this passage at whatever speed feels genuinely natural to "
            "you when you're a bit excited or in a hurry — not the slow, "
            "deliberate pace from earlier passages. If that means going "
            "fast, go fast."
        ),
        "text": (
            "Okay so basically what happened was I was already running "
            "late, and then I couldn't find my keys anywhere, and I "
            "checked literally every pocket twice, and it turned out they "
            "were just sitting on the kitchen counter the entire time, "
            "right where I always leave them, which honestly should have "
            "been the first place I looked."
        ),
    },
    {
        "id": "fast_read_2",
        "instructions": "Same energy — quick, natural, a little breathless if that's genuine for you.",
        "text": (
            "Wait, wait, hold on, before you say anything, just let me "
            "explain, because I know how this looks, but it's actually not "
            "what you think, and if you just give me like two minutes I "
            "can walk you through the whole thing."
        ),
    },
    {
        "id": "fast_read_3",
        "instructions": "Read quickly and energetically, like you're excitedly telling someone big news.",
        "text": (
            "You will not believe what just happened, I still can't even "
            "process it, we were just standing there and then out of "
            "nowhere the whole thing just, it just worked, first try, no "
            "issues, nothing, and everyone just kind of stood there in "
            "silence for a second before anyone even reacted."
        ),
    },
    {
        "id": "free_talk_1",
        "instructions": (
            "No script for this one. Talk for 60 to 90 seconds, in your "
            "own natural rhythm, about anything that's on your mind right "
            "now — your day, something you're excited about, a random "
            "thought. Speak at whatever pace comes naturally, including "
            "fast if that's genuinely how you'd say it. Don't worry about "
            "'ums' or restarts."
        ),
        "text": "",
    },
    {
        "id": "free_talk_2",
        "instructions": (
            "Another free-talk one, no script. This time, explain something "
            "you know well or are enthusiastic about, the way you'd "
            "actually explain it to a friend if you got a little excited "
            "mid-explanation. 60 to 90 seconds, natural pace and energy."
        ),
        "text": "",
    },
    {
        "id": "free_talk_3",
        "instructions": (
            "Last free-talk one. Vent, rant, or ramble for 60 to 90 "
            "seconds about something mildly annoying or frustrating, the "
            "way you actually would out loud. This tends to bring out a "
            "faster, more clipped natural rhythm — lean into that."
        ),
        "text": "",
    },
]

SINGING = [
    {
        "id": "sing_scale",
        "instructions": (
            "Hum or sing an ascending then descending scale on any comfortable "
            "vowel sound (\"ah\" or \"oh\"), covering as much of your natural "
            "range as feels comfortable. No need to be a singer — this just "
            "helps capture your pitch range."
        ),
    },
    {
        "id": "sing_tune",
        "instructions": (
            "Sing this traditional (public-domain) nursery rhyme tune at a "
            "comfortable pitch:"
        ),
        "text": "Mary had a little lamb, its fleece was white as snow.",
    },
]


def build_flat_prompt_list():
    prompts = []

    for item in NEUTRAL_NARRATION:
        prompts.append(
            {
                "id": item["id"],
                "category": "Neutral Narration",
                "instructions": item["instructions"],
                "text": item["text"],
            }
        )

    for s in EMPHASIS_SETS:
        for i, variant in enumerate(s["variants"]):
            prompts.append(
                {
                    "id": f"{s['id']}_v{i}",
                    "category": "Emphasis & Stress",
                    "instructions": s["instructions"],
                    "text": variant,
                }
            )

    for item in QUESTIONS_EXCLAMATIONS:
        prompts.append(
            {
                "id": item["id"],
                "category": "Questions & Exclamations",
                "instructions": "Read with natural, genuine intonation for this sentence type.",
                "text": item["text"],
            }
        )

    for item in CONVERSATIONAL_RHYTHM:
        prompts.append(
            {
                "id": item["id"],
                "category": "Conversational Rhythm",
                "instructions": item["instructions"],
                "text": item["text"],
            }
        )

    for item in EXTENDED_NARRATION + EXTENDED_NARRATION_2 + EXTENDED_NARRATION_3:
        prompts.append(
            {
                "id": item["id"],
                "category": "Extended Narration",
                "instructions": item["instructions"],
                "text": item["text"],
            }
        )

    for s in MORE_EMPHASIS_SETS:
        for i, variant in enumerate(s["variants"]):
            prompts.append(
                {
                    "id": f"{s['id']}_v{i}",
                    "category": "Emphasis & Stress",
                    "instructions": s["instructions"],
                    "text": variant,
                }
            )

    for item in MORE_QUESTIONS_EXCLAMATIONS:
        prompts.append(
            {
                "id": item["id"],
                "category": "Questions & Exclamations",
                "instructions": "Read with natural, genuine intonation for this sentence type.",
                "text": item["text"],
            }
        )

    for item in MORE_CONVERSATIONAL:
        prompts.append(
            {
                "id": item["id"],
                "category": "Conversational Rhythm",
                "instructions": item["instructions"],
                "text": item["text"],
            }
        )

    for item in NATURAL_AND_FAST_SPEECH:
        prompts.append(
            {
                "id": item["id"],
                "category": "Natural & Fast Speech",
                "instructions": item["instructions"],
                "text": item.get("text", ""),
            }
        )

    for item in SINGING:
        prompts.append(
            {
                "id": item["id"],
                "category": "Singing / Pitch Range",
                "instructions": item["instructions"],
                "text": item.get("text", ""),
            }
        )

    return prompts
