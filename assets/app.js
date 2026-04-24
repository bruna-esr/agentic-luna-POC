/* ============================================================
   Newsela Luna POC — shared JS
   Handles:
   - Hero input submit (index.html -> luna.html with prompt)
   - V2 intent routing (v2.html -> destinations via toast)
   - Chat simulation (thinking steps + streaming + artifact reveal)
   ============================================================ */

(function () {
  // -------- URL helpers --------
  function getParam(name) {
    const p = new URLSearchParams(window.location.search);
    return p.get(name);
  }

  // -------- Homepage v1: submit routes to luna.html --------
  window.initHomepage = function () {
    const input = document.getElementById('hero-input');
    const submit = document.getElementById('hero-submit');
    const chips = document.querySelectorAll('[data-chip-prompt]');
    const cards = document.querySelectorAll('[data-capability]');

    function go(prompt) {
      const url = 'luna.html?prompt=' + encodeURIComponent(prompt);
      window.location.href = url;
    }

    if (submit) {
      submit.addEventListener('click', function () {
        const v = (input.value || '').trim();
        if (!v) {
          input.focus();
          return;
        }
        go(v);
      });
    }
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit.click();
        }
      });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        go(c.getAttribute('data-chip-prompt'));
      });
    });
    cards.forEach(function (c) {
      c.addEventListener('click', function () {
        const cap = c.getAttribute('data-capability');
        if (cap === 'lesson-planner') go('Help me plan a 45-minute lesson on photosynthesis for 5th graders');
        else if (cap === 'text-set') go('Build a text set on civil rights for 7th grade ELA');
        else if (cap === 'text-leveler') window.location.href = 'leveler.html';
      });
    });
  };

  // -------- Homepage v3: MVP — always routes to luna-v3.html --------
  window.initHomepageV3 = function () {
    const input = document.getElementById('hero-input');
    const submit = document.getElementById('hero-submit');
    const chips = document.querySelectorAll('[data-chip-prompt]');

    function go(prompt) {
      window.location.href = 'luna-v3.html?prompt=' + encodeURIComponent(prompt);
    }

    if (submit) {
      submit.addEventListener('click', function () {
        const v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        go(v);
      });
    }
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit.click();
        }
      });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        go(c.getAttribute('data-chip-prompt'));
      });
    });
  };

  // -------- Homepage v2: intent-based routing --------
  window.initHomepageV2 = function () {
    const input = document.getElementById('hero-input');
    const submit = document.getElementById('hero-submit');
    const chips = document.querySelectorAll('[data-chip-prompt]');
    const toast = document.getElementById('routing-toast');
    const destEl = document.getElementById('routing-dest');

    function classify(prompt) {
      const p = prompt.toLowerCase();
      if (/level|simplif|rewrite|reading level|grade level/.test(p) && /(3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th|grade)/.test(p)) {
        return { dest: 'leveler.html', label: 'Text Leveler' };
      }
      if (/level|simplif/.test(p)) {
        return { dest: 'leveler.html', label: 'Text Leveler' };
      }
      if (/lesson|plan|activity|discussion questions|objective/.test(p)) {
        return { dest: 'lesson-planner.html', label: 'Lesson Planner' };
      }
      if (/find|search|articles? about|news|current events/.test(p)) {
        return { dest: 'search.html', label: 'Search' };
      }
      return { dest: 'luna.html', label: 'Luna Chat' };
    }

    function route(prompt) {
      const { dest, label } = classify(prompt);
      destEl.textContent = label;
      toast.classList.add('show');
      setTimeout(function () {
        window.location.href = dest + '?prompt=' + encodeURIComponent(prompt) + '&from=v2';
      }, 1100);
    }

    if (submit) {
      submit.addEventListener('click', function () {
        const v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        route(v);
      });
    }
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit.click();
        }
      });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        route(c.getAttribute('data-chip-prompt'));
      });
    });
  };

  // -------- Luna chat page --------
  window.initLuna = function (opts) {
    const isV3 = !!(opts && opts.v3);
    const isV4 = !!(opts && opts.v4);
    const stream = document.getElementById('chat-stream');
    const shell = document.getElementById('luna-shell');
    const artBody = document.getElementById('artifact-body');
    const artActions = document.getElementById('artifact-actions');
    const artClose = document.getElementById('art-close');
    const artTitle = document.getElementById('art-title');
    const artSub = document.getElementById('art-sub');
    const previewModal = document.getElementById('preview-modal');
    const pmTitleText = document.getElementById('pm-title-text');
    const pmSub = document.getElementById('pm-sub');
    const pmBody = document.getElementById('pm-body');
    const pmFooter = document.getElementById('pm-footer');
    const pmClose = document.getElementById('preview-modal-close');
    const chatTitle = document.getElementById('chat-title');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');

    const initialPrompt = getParam('prompt') ||
      (isV3 || isV4
        ? 'Find me an article about firefighters for my 2nd grade community helpers unit'
        : 'Build a community helpers bundle for 2nd grade ELA with a mix of articles and videos');

    // Conversation state — tracks what the teacher has confirmed so far
    const state = {
      flow: null,            // 'bundle' | 'single'
      grade: null,           // e.g. '2nd'
      topic: 'community helpers',
      selectedContent: [],   // array of content ids chosen by teacher
      supports: (isV3 || isV4)
        ? { lessonPlan: true, quiz: false, go: false }
        : { lessonPlan: true, quiz: true, go: false },
      // V3 lesson plan inputs
      learningObjective: '',
      standards: [],         // up to 3 CCSS codes
      allottedTime: '45 min',
      // V3 graphic organizer selection (multi-select)
      goTypes: []            // array of ids from GO_TYPES
    };

    const GO_TYPES = [
      { id: 'anticipation-guide', label: 'Anticipation guide', desc: 'Students predict agree/disagree before reading, then revisit after.' },
      { id: 'central-idea',       label: 'Central idea',       desc: 'Central idea with supporting details.' },
      { id: 'cer-chart',          label: 'CER chart',          desc: 'Claim, evidence, reasoning framework.' },
      { id: 'compare-contrast',   label: 'Compare and contrast', desc: 'Side-by-side similarities and differences.' }
    ];

    // Topic-aware result sets for the V3 single-content picker.
    // Declared here (above the sync kick-off) so getTopicConfig() can read it
    // during routeInitialPrompt → runSingleSearch without hitting the TDZ.
    // Each topic has 4 articles + 4 videos so that any filter (article-only,
    // video-only, or mixed) can surface 4 results. Items are ordered so the
    // first 4 form a balanced mix; "View more results" reveals items 5–8.
    const SINGLE_RESULTS_BY_TOPIC = {
      firefighters: {
        defaultGrade: '2nd',
        shortTitle: 'Community Helpers',
        topicLabel: 'community helpers',
        searchSource: 'Newsela ELA library',
        resultsNoun: 'articles and videos',
        items: [
          { id: 's-1', type: 'article', typeLabel: 'Article', title: 'Meet the firefighters keeping our neighborhood safe', length: '4 min read', grade: 'Gr 2', gradient: ['#ffb199','#ffd8c8'],
            lexile: '420L', wordCount: 312, standards: ['RI.2.1','RI.2.3'], keywords: ['firefighters','safety','rescue'],
            summary: 'A look inside a local firehouse — the trucks, tools, and teamwork firefighters rely on to keep their community safe.',
            excerpt: 'When there is a fire, firefighters are the first people to help. They wear big, strong suits called "turnout gear" that keep them safe from heat and smoke. Firefighters work together as a team. One may drive the truck. Another may connect the long hose to a hydrant. A third may help people get out of a building safely.' },
          { id: 's-2', type: 'article', typeLabel: 'Article', title: 'Firefighters at work: Inside the firehouse', length: '5 min read', grade: 'Gr 2', gradient: ['#ffd8c8','#f5ddf3'],
            lexile: '450L', wordCount: 380, standards: ['RI.2.1','RI.2.3','RI.2.7'], keywords: ['firefighters','firehouse','daily life'],
            summary: 'Explore a firehouse from top to bottom — the engine bay, the sleeping quarters, and the training room.',
            excerpt: 'Walk into a firehouse and you will see a lot more than just fire trucks. Firefighters sometimes sleep at the firehouse because they have to be ready to help at any hour. There is a kitchen where they cook meals together. There is a training room where they practice. And of course, there is the big engine bay where the fire trucks wait, shiny and ready to go.' },
          { id: 's-4', type: 'video',   typeLabel: 'Video',   title: 'A firefighter shows us her gear', length: '2 min watch', grade: 'Gr 2', gradient: ['#f5ddf3','#ffd8c8'],
            lexile: 'N/A', wordCount: null, standards: ['SL.2.2','RI.2.3'], keywords: ['firefighters','gear','equipment'],
            summary: 'Firefighter Jenna walks students through every piece of her gear — from her helmet to her boots.',
            excerpt: 'In this 2-minute video, Firefighter Jenna shows and explains every piece of her turnout gear. Students see how a helmet, air tank, and heavy boots work together to protect a firefighter on the job.' },
          { id: 's-6', type: 'video',   typeLabel: 'Video',   title: 'A day in the life of Firefighter Marcus', length: '3 min watch', grade: 'Gr 2', gradient: ['#ffb199','#f5ddf3'],
            lexile: 'N/A', wordCount: null, standards: ['SL.2.2','RI.2.3'], keywords: ['firefighter','daily life','community'],
            summary: 'Firefighter Marcus takes us through a full shift — from morning roll call to a real emergency call.',
            excerpt: 'This 3-minute video follows Firefighter Marcus through a full day at Station 14. You will see his morning check of the equipment, a school visit where he teaches fire safety, and a surprise call that takes the whole team into action.' },
          { id: 's-3', type: 'article', typeLabel: 'Article', title: 'What firefighters teach us about fire safety', length: '3 min read', grade: 'Gr 2', gradient: ['#e1efff','#bcd8ff'],
            lexile: '400L', wordCount: 260, standards: ['RI.2.1','RI.2.3'], keywords: ['fire safety','prevention','home'],
            summary: 'Key fire safety tips firefighters want every kid to know — smoke alarms, escape plans, and what to do if there is a fire.',
            excerpt: 'Firefighters do not just put out fires — they also teach kids how to stay safe. Did you know that a smoke alarm can save a life? Firefighters say every home should have one. If a fire ever starts, the first rule is simple: get out and stay out. Then call for help. Firefighters also teach kids to "stop, drop, and roll" if their clothes catch fire.' },
          { id: 's-5', type: 'article', typeLabel: 'Article', title: 'What it takes to be a firefighter: training and teamwork', length: '4 min read', grade: 'Gr 2', gradient: ['#ffd8c8','#e1efff'],
            lexile: '430L', wordCount: 325, standards: ['RI.2.1','RI.2.3'], keywords: ['training','teamwork','firefighter'],
            summary: 'A close look at the training firefighters go through and the teamwork that makes every rescue possible.',
            excerpt: 'Becoming a firefighter takes months of training. New firefighters learn how to use hoses, climb ladders, and care for people who are hurt. They practice together as a team because every fire is different. During an emergency, one firefighter cannot do the job alone. They rely on each other to stay safe and help the people who need them.' },
          { id: 's-9', type: 'article', typeLabel: 'Article', title: 'How firefighters use technology to fight fires', length: '4 min read', grade: 'Gr 2', gradient: ['#c7efd1','#d9eaff'],
            lexile: '440L', wordCount: 295, standards: ['RI.2.1','RI.2.3'], keywords: ['technology','tools','firefighter'],
            summary: 'From thermal cameras to computer-aided dispatch, a look at the modern tools firefighters rely on.',
            excerpt: 'Firefighters today use more technology than ever before. A thermal camera can see through smoke to find people who are trapped. A computer inside the truck shows the fastest route to the fire. And a radio keeps the whole team connected at every step of the rescue.' },
          { id: 's-10', type: 'article', typeLabel: 'Article', title: 'Women in firefighting: breaking barriers on the job', length: '4 min read', grade: 'Gr 2', gradient: ['#f5ddf3','#bcd8ff'],
            lexile: '415L', wordCount: 300, standards: ['RI.2.1','RI.2.3'], keywords: ['women','careers','firefighter'],
            summary: 'Meet some of the women who have joined fire departments and are changing what it means to be a firefighter.',
            excerpt: 'For a long time, most firefighters were men. But that is changing. Today, women all over the country are becoming firefighters. They go through the same tough training, carry the same heavy equipment, and respond to the same emergencies. Many say they chose the job because they wanted to help their community and make a difference every single day.' },
          { id: 's-7', type: 'video',   typeLabel: 'Video',   title: 'Inside a fire engine: the trucks that save lives', length: '2 min watch', grade: 'Gr 2', gradient: ['#e8d8ff','#ffd8c8'],
            lexile: 'N/A', wordCount: null, standards: ['SL.2.2','RI.2.3'], keywords: ['fire engine','equipment','vehicles'],
            summary: 'A guided tour inside a fire engine — from the hoses and ladders to the computer that helps the team find an emergency.',
            excerpt: 'In this short video, a firefighter opens every compartment on her engine. Students will see axes, hoses, first-aid kits, and the special computer that shows the crew exactly where they need to go.' },
          { id: 's-8', type: 'video',   typeLabel: 'Video',   title: "A smoke alarm lesson: a firefighter visits the classroom", length: '3 min watch', grade: 'Gr 2', gradient: ['#bcd8ff','#ffcad4'],
            lexile: 'N/A', wordCount: null, standards: ['SL.2.2','RI.2.3'], keywords: ['smoke alarm','fire safety','home'],
            summary: 'A friendly firefighter teaches a class how a smoke alarm works — and why it matters at home.',
            excerpt: 'Firefighter Linda visits a 2nd-grade classroom with a smoke alarm and a lesson. Students learn why the alarm beeps, how to test it once a month, and what to do if it goes off at night.' }
        ]
      },
      'rl-4-5': {
        defaultGrade: '4th',
        shortTitle: 'RL.4.5 — Poems, Drama & Prose',
        topicLabel: 'RL.4.5 — structural elements of poems, drama, and prose',
        searchSource: 'Newsela ELA library aligned to RL.4.5',
        resultsNoun: 'resources',
        items: [
          { id: 'rl-1', type: 'article', typeLabel: 'Article', title: 'How poems are built: lines, stanzas, and rhyme', length: '4 min read', grade: 'Gr 4', gradient: ['#ffe2a8','#ffcad4'],
            lexile: '770L', wordCount: 410, standards: ['RL.4.5','RL.4.4'], keywords: ['poetry','stanza','rhyme','structure'],
            summary: 'Explore the building blocks poets use — lines, stanzas, rhyme, and rhythm — and why those choices shape how a poem feels.',
            excerpt: 'A poem looks different from a story on the page. Instead of paragraphs, a poem is built from lines, and groups of lines are called stanzas. Some poems use rhyme at the ends of lines; others use rhythm, or a pattern of beats, to create a feeling. When a poet breaks a line in a surprising place, they are asking you to pause and notice something.' },
          { id: 'rl-2', type: 'article', typeLabel: 'Article', title: 'Reading a play: stage directions, dialogue, and scenes', length: '5 min read', grade: 'Gr 4', gradient: ['#cfd8ff','#e8d3ff'],
            lexile: '790L', wordCount: 450, standards: ['RL.4.5','RL.4.3'], keywords: ['drama','stage directions','dialogue','scenes'],
            summary: 'A guide to the parts of a play — cast lists, scene settings, dialogue, and stage directions — and how each one tells you something different.',
            excerpt: 'Plays are written to be acted out, so they are organized in a very different way than a story. At the top you will find the cast — the list of characters. Scene headings tell you where and when the action happens. The dialogue is what the characters say out loud. And the stage directions, often in italics, tell the actors how to move, speak, or feel.' },
          { id: 'rl-4', type: 'video',   typeLabel: 'Video',   title: 'From verse to scene: poems, plays, and stories compared', length: '3 min watch', grade: 'Gr 4', gradient: ['#f5ddf3','#bcd8ff'],
            lexile: 'N/A', wordCount: null, standards: ['RL.4.5','SL.4.2'], keywords: ['poems','plays','prose','structure'],
            summary: 'A short video walks through three versions of the same moment — as a poem, a scene from a play, and a paragraph of prose — to show how structure changes meaning.',
            excerpt: 'In this 3-minute video, students see the same small story — a kid losing a pet — written three ways: as a stanza of a poem, as a scene from a play with stage directions, and as a paragraph of prose. A narrator highlights the structural clues that tell you which is which.' },
          { id: 'rl-6', type: 'video',   typeLabel: 'Video',   title: 'Reading a poem out loud: finding the stanzas', length: '3 min watch', grade: 'Gr 4', gradient: ['#ffcad4','#cfd8ff'],
            lexile: 'N/A', wordCount: null, standards: ['RL.4.5','SL.4.2'], keywords: ['poetry','stanzas','reading aloud'],
            summary: 'A teacher models how to read a poem aloud, pausing at line breaks and stanza breaks to show how structure shapes meaning.',
            excerpt: 'In this 3-minute video, Ms. Patel reads a short poem aloud three times — once flat, once rushing through the line breaks, and once pausing carefully. Students hear how the structure of a poem shapes the way it sounds and the way we understand it.' },
          { id: 'rl-3', type: 'article', typeLabel: 'Article', title: 'What makes a poem different from a story?', length: '3 min read', grade: 'Gr 4', gradient: ['#c7efd1','#bcd8ff'],
            lexile: '750L', wordCount: 320, standards: ['RL.4.5'], keywords: ['poetry','prose','comparison','structure'],
            summary: 'A side-by-side look at how a poem and a short story about the same event can feel totally different because of how they are built.',
            excerpt: 'Imagine two writers describing the same rainy afternoon. One writes a story: "The rain tapped against Maria\'s window while she waited for her grandmother to arrive." The other writes a poem, arranging just a few words across three short lines. Same rain, same window — but a very different reading experience. The difference is not the topic. It is the structure.' },
          { id: 'rl-5', type: 'article', typeLabel: 'Article', title: 'The structure of a short story: beginning, middle, and end', length: '4 min read', grade: 'Gr 4', gradient: ['#d0f0d0','#ffe2a8'],
            lexile: '780L', wordCount: 395, standards: ['RL.4.5','RL.4.3'], keywords: ['short story','prose','structure','plot'],
            summary: 'A clear overview of how most short stories are built — a setup, a problem, and a resolution.',
            excerpt: 'A short story is a piece of prose that tells a complete tale in a small space. Most short stories follow a simple structure. The beginning sets up the characters and setting. The middle introduces a problem the main character must face. The end shows how the character solves it — or learns something along the way.' },
          { id: 'rl-7', type: 'video',   typeLabel: 'Video',   title: 'Staging a scene: how a play comes alive', length: '4 min watch', grade: 'Gr 4', gradient: ['#e8d3ff','#c7efd1'],
            lexile: 'N/A', wordCount: null, standards: ['RL.4.5','SL.4.2'], keywords: ['drama','stage directions','scene'],
            summary: 'Watch a single scene acted out, then see the script page beside it — so students can connect each structural element to what happens on stage.',
            excerpt: 'This 4-minute video pairs a scene from a short play with its script. As actors speak and move, callouts highlight the stage directions, dialogue, and scene heading that shaped each moment. It is a visual way to see the parts of a play working together.' },
          { id: 'rl-8', type: 'video',   typeLabel: 'Video',   title: 'Line break or paragraph? Spotting the difference', length: '2 min watch', grade: 'Gr 4', gradient: ['#bcd8ff','#ffe2a8'],
            lexile: 'N/A', wordCount: null, standards: ['RL.4.5','SL.4.2'], keywords: ['poetry','prose','structure','line break'],
            summary: 'A fast-paced video flashes short excerpts on screen and asks students to decide: poem, play, or prose?',
            excerpt: 'In this 2-minute video, short text excerpts appear on screen one at a time. After each one, students are asked to identify whether they are looking at a poem, a play, or a paragraph of prose — based only on structural clues like line breaks, stage directions, or paragraphs.' }
        ]
      },
      'water-cycle': {
        defaultGrade: '3rd',
        shortTitle: 'Water Cycle',
        topicLabel: 'the water cycle',
        searchSource: 'Newsela science library',
        resultsNoun: 'articles and videos',
        items: [
          { id: 'wc-2', type: 'article', typeLabel: 'Article', title: 'How clouds form and bring us rain', length: '4 min read', grade: 'Gr 3', gradient: ['#d9eaff','#e8f4ff'],
            lexile: '620L', wordCount: 310, standards: ['RI.3.1','RI.3.3'], keywords: ['clouds','condensation','precipitation'],
            summary: 'Learn how warm, wet air rises into the sky, cools off, and turns into the clouds that eventually bring rain.',
            excerpt: 'Have you ever watched a cloud and wondered where it came from? Clouds start out as water. When the sun warms a lake or even a puddle, some of the water turns into a gas called water vapor and rises into the sky. Up high, the air is cold. The vapor cools and turns back into tiny drops. Lots of those drops together is what we see as a cloud.' },
          { id: 'wc-3', type: 'article', typeLabel: 'Article', title: 'Evaporation: where does water go when a puddle dries up?', length: '3 min read', grade: 'Gr 3', gradient: ['#c7efd1','#d9eaff'],
            lexile: '600L', wordCount: 275, standards: ['RI.3.1','RI.3.3'], keywords: ['evaporation','puddle','sun','water vapor'],
            summary: 'A friendly intro to evaporation — what makes a puddle disappear and where that water actually goes.',
            excerpt: 'After it rains, you might see a puddle on the sidewalk. Come back a few hours later, and the puddle is gone. Where did the water go? The answer is evaporation. When the sun warms the water in the puddle, the water slowly turns into a gas called water vapor. The vapor floats up into the air — so light that you cannot see it.' },
          { id: 'wc-1', type: 'video',   typeLabel: 'Video',   title: 'Follow a raindrop: the water cycle in action', length: '3 min watch', grade: 'Gr 3', gradient: ['#bcd8ff','#d9eaff'],
            lexile: 'N/A', wordCount: null, standards: ['RI.3.7','SL.3.2'], keywords: ['water cycle','rain','evaporation','condensation'],
            summary: 'A 3-minute animated video that follows a single raindrop through the full water cycle, narrated for 3rd graders.',
            excerpt: 'This 3-minute video follows one raindrop — starting in a puddle, rising into the air as water vapor, forming a cloud, and falling back to earth as rain. Simple animations label each step of the cycle along the way.' },
          { id: 'wc-6', type: 'video',   typeLabel: 'Video',   title: 'Watching evaporation: a simple classroom experiment', length: '3 min watch', grade: 'Gr 3', gradient: ['#d9eaff','#c7efd1'],
            lexile: 'N/A', wordCount: null, standards: ['RI.3.7','SL.3.2'], keywords: ['evaporation','experiment','science'],
            summary: 'Students set up a simple cup-and-sunlight experiment and watch evaporation happen over a few days.',
            excerpt: 'In this 3-minute video, a 3rd-grade class marks the water level in a clear cup, puts it in a sunny window, and checks it every day. By the end, the class can see — and measure — how much water has disappeared into the air.' },
          { id: 'wc-4', type: 'article', typeLabel: 'Article', title: 'The four stages of the water cycle', length: '5 min read', grade: 'Gr 3', gradient: ['#bcd8ff','#c7efd1'],
            lexile: '650L', wordCount: 375, standards: ['RI.3.1','RI.3.3','RI.3.7'], keywords: ['evaporation','condensation','precipitation','collection'],
            summary: 'A clear overview of the four stages of the water cycle — evaporation, condensation, precipitation, and collection — with simple examples of each.',
            excerpt: 'The water cycle is the path water takes as it moves around our planet, over and over again. Scientists break it into four main stages. First, evaporation: the sun heats water, and it turns into a gas. Second, condensation: the gas cools and forms clouds. Third, precipitation: water falls as rain, snow, sleet, or hail. Fourth, collection: water gathers in oceans, lakes, and rivers — ready to start the cycle again.' },
          { id: 'wc-5', type: 'article', typeLabel: 'Article', title: 'Why the ocean is the biggest part of the water cycle', length: '4 min read', grade: 'Gr 3', gradient: ['#bcd8ff','#d0f0d0'],
            lexile: '640L', wordCount: 330, standards: ['RI.3.1','RI.3.3'], keywords: ['ocean','water cycle','evaporation'],
            summary: 'Most of the water on Earth is in the ocean. Learn how the ocean drives the biggest part of the water cycle every single day.',
            excerpt: 'Did you know that most of the water on our planet is in the ocean? The sun warms the ocean every day, and huge amounts of water turn into vapor and rise into the sky. That vapor forms clouds that drift over land, where they eventually let go of their rain. The ocean is the starting point for most of the water we see.' },
          { id: 'wc-7', type: 'video',   typeLabel: 'Video',   title: 'Cloud types: what the sky tells us', length: '3 min watch', grade: 'Gr 3', gradient: ['#e8f4ff','#bcd8ff'],
            lexile: 'N/A', wordCount: null, standards: ['RI.3.7','SL.3.2'], keywords: ['clouds','weather','sky'],
            summary: 'A short video walks through the main cloud types — cumulus, stratus, and cirrus — and what each one can tell us about the weather ahead.',
            excerpt: 'Have you ever looked up and wondered what kind of clouds you were seeing? This 3-minute video shows the three main cloud families. Students learn the names and what each type usually means: a sunny afternoon, a rainy day, or a change in the weather.' },
          { id: 'wc-8', type: 'video',   typeLabel: 'Video',   title: 'The journey of a snowflake through the water cycle', length: '3 min watch', grade: 'Gr 3', gradient: ['#e1efff','#d9eaff'],
            lexile: 'N/A', wordCount: null, standards: ['RI.3.7','SL.3.2'], keywords: ['snow','precipitation','water cycle'],
            summary: 'Follow a single snowflake from the cloud to the ground — and all the way back up again.',
            excerpt: 'Not all precipitation is rain. This 3-minute video follows a single snowflake as it forms high in a cold cloud, drifts to the ground, melts in the spring sun, and begins the journey all over again.' }
        ]
      },
      mayflower: {
        defaultGrade: '7th',
        shortTitle: 'The Mayflower Voyage',
        topicLabel: 'the Mayflower voyage',
        searchSource: 'Newsela social studies library',
        resultsNoun: 'articles and videos',
        items: [
          { id: 'm-1', type: 'article', typeLabel: 'Article', title: "The Mayflower's 66-day voyage: 102 passengers cross the Atlantic", length: '5 min read', grade: 'Gr 7', gradient: ['#bcd8ff','#d9eaff'],
            lexile: '950L', wordCount: 540, standards: ['RI.7.1','RI.7.3'], keywords: ['Mayflower','voyage','Atlantic','1620'],
            summary: 'A look at the 1620 voyage of the Mayflower — the route, the timeline, and the storms that nearly turned the ship back to England.',
            excerpt: 'In September 1620, a small merchant ship called the Mayflower set sail from Plymouth, England, bound for the New World. On board were 102 passengers — about half of them Separatists, members of a religious group seeking the freedom to practice their faith. The voyage was supposed to take roughly two months. Instead, it stretched to 66 grueling days at sea, plagued by storms, leaks, and seasickness. By the time the ship sighted land off Cape Cod in November, it was already too late in the year to plant crops.' },
          { id: 'm-2', type: 'article', typeLabel: 'Article', title: 'Who were the Pilgrims? The English Separatists behind the Mayflower', length: '6 min read', grade: 'Gr 7', gradient: ['#e8d8ff','#cfd8ff'],
            lexile: '980L', wordCount: 580, standards: ['RI.7.1','RI.7.2'], keywords: ['Pilgrims','Separatists','religion','England'],
            summary: 'The story of the religious dissenters whose search for freedom led them across an ocean — and how they came to be called Pilgrims.',
            excerpt: 'Long before they boarded the Mayflower, the people we now call the Pilgrims were known by a different name: Separatists. In early 17th-century England, the Church of England was the official church, and the king expected everyone to belong to it. The Separatists believed the Church was beyond reform. They wanted to leave it altogether — a dangerous decision in a country where religious dissent could mean prison or worse.' },
          { id: 'm-3', type: 'video',   typeLabel: 'Video',   title: "Mapping the Mayflower's Atlantic crossing", length: '4 min watch', grade: 'Gr 7', gradient: ['#d9eaff','#bcd8ff'],
            lexile: 'N/A', wordCount: null, standards: ['SL.7.2','RI.7.7'], keywords: ['Mayflower','navigation','Atlantic','map'],
            summary: "An animated map traces the Mayflower's route from Plymouth, England across the Atlantic — including the storms that pushed the ship far off course.",
            excerpt: "This 4-minute video uses an animated map to follow the Mayflower across the Atlantic. As the route unfolds, narration explains why the ship aimed for the mouth of the Hudson River but landed hundreds of miles north at Cape Cod, and how a single navigational decision reshaped the colony's future." },
          { id: 'm-4', type: 'video',   typeLabel: 'Video',   title: 'Inside the Mayflower: a tour of the cramped passenger ship', length: '5 min watch', grade: 'Gr 7', gradient: ['#cfd8ff','#e8d3ff'],
            lexile: 'N/A', wordCount: null, standards: ['SL.7.2','RI.7.3'], keywords: ['Mayflower','ship','daily life','replica'],
            summary: 'A historian walks through a full-scale replica of the Mayflower to show students just how little space 102 passengers shared.',
            excerpt: 'In this 5-minute video, a historian leads a tour of the Mayflower II — a full-scale replica docked in Plymouth, Massachusetts. Students see the gun deck, where most passengers spent the entire voyage, and learn why bunks, privacy, and even daylight were nearly impossible to find on a ship of this size.' },
          { id: 'm-5', type: 'article', typeLabel: 'Article', title: 'Life aboard the Mayflower: cramped quarters and brutal conditions', length: '5 min read', grade: 'Gr 7', gradient: ['#c7efd1','#d9eaff'],
            lexile: '940L', wordCount: 510, standards: ['RI.7.1','RI.7.3'], keywords: ['shipboard life','passengers','daily routine'],
            summary: 'What was day-to-day life like during the voyage — meals, sleep, illness, and the constant motion of a ship at sea?',
            excerpt: "For 66 days, 102 passengers shared a wooden ship roughly 100 feet long. Most of the Mayflower's passengers spent the voyage on the gun deck, a low-ceilinged space crowded with families, supplies, and even livestock. Cooking was nearly impossible at sea — meals were usually cold biscuits, salted meat, and beer. Seasickness was common, and at least one passenger died during the voyage. By the time the ship reached land, nearly everyone aboard was exhausted and sick." },
          { id: 'm-6', type: 'article', typeLabel: 'Article', title: "The Wampanoag and the Pilgrims: a Native nation's first encounter", length: '6 min read', grade: 'Gr 7', gradient: ['#ffe2a8','#ffcad4'],
            lexile: '1010L', wordCount: 620, standards: ['RI.7.1','RI.7.2','RI.7.6'], keywords: ['Wampanoag','Indigenous','encounter','Massasoit'],
            summary: 'The Pilgrims did not land in an empty wilderness. The Wampanoag had lived on this land for thousands of years — and they had their own reasons for meeting the new arrivals.',
            excerpt: 'Long before the Mayflower arrived, the land we now call New England was home to the Wampanoag — a confederation of Native nations that had lived along the coast for thousands of years. By 1620, the Wampanoag had already endured a devastating epidemic, likely brought by European fishermen years earlier. When the Pilgrims landed, the Wampanoag faced a difficult choice: keep their distance from the new arrivals or build an alliance that might protect them from rival nations.' },
          { id: 'm-7', type: 'video',   typeLabel: 'Video',   title: "Plymouth in 1621: the story behind the 'first Thanksgiving'", length: '4 min watch', grade: 'Gr 7', gradient: ['#ffcad4','#e8d3ff'],
            lexile: 'N/A', wordCount: null, standards: ['SL.7.2','RI.7.6'], keywords: ['Plymouth','Thanksgiving','Wampanoag','primary sources'],
            summary: 'A short documentary separates myth from history in the well-known story of the 1621 harvest gathering between the Pilgrims and the Wampanoag.',
            excerpt: "In this 4-minute video, historians at Plimoth Patuxet Museums walk students through what we actually know — and don't know — about the 1621 harvest gathering. Using primary sources and the perspectives of Wampanoag descendants, the video reframes the familiar Thanksgiving story." },
          { id: 'm-8', type: 'article', typeLabel: 'Article', title: 'The Mayflower Compact: an early experiment in self-government', length: '5 min read', grade: 'Gr 7', gradient: ['#bcd8ff','#c7efd1'],
            lexile: '990L', wordCount: 560, standards: ['RI.7.1','RI.7.2','RI.7.3'], keywords: ['Mayflower Compact','self-government','democracy','colony'],
            summary: 'Before stepping off the ship, 41 men signed a short agreement that would shape the colony for decades. What did it actually say — and why does it matter?',
            excerpt: "When the Mayflower anchored off Cape Cod, a problem emerged. The colonists' charter had been for Virginia, and some passengers argued that without it, no laws applied. To prevent the colony from falling apart before it began, 41 of the men aboard signed a short document we now call the Mayflower Compact. In just a few sentences, they agreed to make laws together and obey them — an early step toward self-government in the English colonies." }
        ]
      }
    };

    // Number of result rows shown in the picker before "View more results".
    // Declared above the sync kick-off so runSingleSearch can read it without
    // hitting the temporal dead zone.
    const INITIAL_RESULT_COUNT = 4;

    artClose && artClose.addEventListener('click', function () {
      shell.classList.remove('with-artifact');
    });

    const openPanelBtn = document.getElementById('open-panel-btn');
    openPanelBtn && openPanelBtn.addEventListener('click', function () {
      shell.classList.add('with-artifact');
    });

    document.addEventListener('click', function () {
      document.querySelectorAll('.stack-menu-dropdown.open').forEach(function (d) {
        d.classList.remove('open');
      });
    });

    // Kick off with the initial user message
    addUserMessage(initialPrompt);
    chatTitle.textContent = truncate(initialPrompt, 48);
    routeInitialPrompt(initialPrompt);

    send && send.addEventListener('click', function () {
      const v = (input.value || '').trim();
      if (!v) return;
      input.value = '';
      addUserMessage(v);
      runFollowUpResponse(v);
    });
    input && input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send.click();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && previewModal && previewModal.classList.contains('open')) {
        closePreviewModal();
      }
    });

    // ============================================================
    // Initial prompt routing
    // ============================================================
    function routeInitialPrompt(prompt) {
      const p = prompt.toLowerCase();

      // Grade detection
      const gm = p.match(/\b(k|kindergarten|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\b/);
      state.grade = gm ? normalizeGrade(gm[1]) : null;

      // V3/V4 MVP: always single-content flow.
      if (isV3 || isV4) {
        state.flow = 'single';
        state.topicKey = detectTopicKey(prompt);
        state.contentType = detectContentType(prompt);
        const cfg = getTopicConfig();
        if (!state.grade) state.grade = cfg.defaultGrade;
        state.topic = cfg.topicLabel;
        runSingleSearch();
        return;
      }

      // Check single-content signals FIRST — they're more specific than bundle signals
      // (a prompt like "an article for my community helpers unit" should be single, not bundle)
      const singleWords = /\ban article\b|\bone article\b|\ba video\b|\bsingle (article|video)\b|\bfind (me )?an article\b/;
      const bundleWords = /bundle|text set|multiple articles|mix of|collection of|several articles|few articles|build (me )?a (set|bundle|unit)/;
      state.flow = singleWords.test(p) ? 'single'
                 : bundleWords.test(p) ? 'bundle'
                 : /lesson/.test(p) ? 'single'  // bare lesson-plan asks → single-content flow
                 : 'bundle';

      if (state.flow === 'bundle') runBundleSearch();
      else runSingleSearch();
    }

    // ============================================================
    // BUNDLE FLOW — surface a pre-made bundle + custom assembly
    // ============================================================
    function runBundleSearch() {
      const lunaEl = addLunaMessage();
      const stepsEl = lunaEl.querySelector('.thinking-steps');
      const textEl = lunaEl.querySelector('.text');

      const steps = [
        'Understanding your teaching goal…',
        'Searching Newsela ELA library for community helpers…',
        'Balancing a mix of articles and videos…',
        'Matching ' + (state.grade || '2nd') + ' grade reading level…'
      ];

      runSteps(stepsEl, steps, function () {
        const count = COMMUNITY_HELPERS_BUNDLE.items.length;
        const reply = state.grade
          ? "I found " + count + " resources that could be great for your community helpers unit — a mix of articles and videos, all at " + state.grade + " grade reading level. Click any one to preview it, and uncheck anything you don't want to include."
          : "I'd like to pull together some community helpers resources for you. Which grade are you teaching so I can match the reading level?";

        streamText(textEl, reply, 14, function () {
          if (!state.grade) {
            renderGradeChips(lunaEl.querySelector('.body'));
          } else {
            renderBundlePicker(lunaEl.querySelector('.body'));
          }
        });
      });
    }

    function renderGradeChips(parent) {
      const wrap = document.createElement('div');
      wrap.className = 'quick-chips';
      ['K', '1st', '2nd', '3rd', '4th', '5th'].forEach(function (g) {
        const b = document.createElement('button');
        b.className = 'quick-chip';
        b.textContent = g;
        b.addEventListener('click', function () {
          state.grade = g;
          addUserMessage(g + ' grade');
          runBundleSearch();
        });
        wrap.appendChild(b);
      });
      parent.appendChild(wrap);
      scrollToBottom();
    }

    function renderBundlePicker(parent) {
      const bundle = COMMUNITY_HELPERS_BUNDLE;
      const card = document.createElement('div');
      card.className = 'bundle-card';
      card.innerHTML =
        '<div class="bundle-header">' +
          '<div class="bundle-title-row">' +
            '<div>' +
              '<div class="bundle-badge">CURATED FOR YOU</div>' +
              '<div class="bundle-title">' + bundle.title + '</div>' +
              '<div class="bundle-sub">' + bundle.items.length + ' resources · ' + state.grade + ' grade · ELA</div>' +
            '</div>' +
            '<div class="bundle-grade">' + state.grade + '</div>' +
          '</div>' +
          '<div class="bundle-hint">Click any resource to preview · use the checkbox to include or remove it</div>' +
        '</div>' +
        '<div class="bundle-items"></div>' +
        '<div class="bundle-footer">' +
          '<button class="ghost-btn add-more-btn">+ Add more content</button>' +
          '<button class="primary-btn confirm-btn">Use these resources →</button>' +
        '</div>';

      const itemsEl = card.querySelector('.bundle-items');
      bundle.items.forEach(function (it) {
        itemsEl.appendChild(buildContentRow(it, { multi: true, selected: true }));
      });

      card.querySelector('.confirm-btn').addEventListener('click', function () {
        // Collect selected
        const checked = card.querySelectorAll('.content-row.selected');
        state.selectedContent = Array.from(checked).map(function (n) { return n.dataset.id; });
        // Disable card
        card.classList.add('locked');
        card.querySelector('.confirm-btn').textContent = 'Resources confirmed ✓';
        card.querySelector('.confirm-btn').disabled = true;
        card.querySelector('.add-more-btn').disabled = true;
        addUserMessage('Use these ' + state.selectedContent.length + ' resources');
        askAboutSupports();
      });

      card.querySelector('.add-more-btn').addEventListener('click', function () {
        const hint = document.createElement('div');
        hint.className = 'inline-hint';
        hint.textContent = 'Full content library would open here — for this prototype the bundle is pre-loaded.';
        card.querySelector('.bundle-footer').before(hint);
        card.querySelector('.add-more-btn').disabled = true;
      });

      parent.appendChild(card);
      scrollToBottom();
    }

    // ============================================================
    // SINGLE CONTENT FLOW
    // ============================================================
    function runSingleSearch() {
      const lunaEl = addLunaMessage();
      const stepsEl = lunaEl.querySelector('.thinking-steps');
      const textEl = lunaEl.querySelector('.text');
      const cfg = getTopicConfig();
      const gradeLabel = state.grade || cfg.defaultGrade;
      const items = getFilteredItems();
      const shownCount = Math.min(items.length, INITIAL_RESULT_COUNT);
      const noun = resultsNounFor(shownCount);

      const steps = [
        'Understanding your teaching goal…',
        'Searching ' + cfg.searchSource + '…',
        'Filtering for ' + gradeLabel + ' grade reading level…',
        'Ranking by relevance…'
      ];

      runSteps(stepsEl, steps, function () {
        const reply = "Here are the top " + shownCount + " " + noun + " on " + cfg.topicLabel + " at " + gradeLabel + " grade level. Pick the one you want to use:";
        streamText(textEl, reply, 14, function () {
          if (isV4) renderSinglePickerV4(lunaEl.querySelector('.body'));
          else renderSinglePicker(lunaEl.querySelector('.body'));
        });
      });
    }

    // Returns the full candidate list for the current topic + content type
    // filter. Picker shows the first INITIAL_RESULT_COUNT (declared above the
    // sync kick-off); "View more results" reveals the rest.
    function getFilteredItems() {
      const cfg = getTopicConfig();
      if (!state.contentType) return cfg.items;
      const filtered = cfg.items.filter(function (it) { return it.type === state.contentType; });
      return filtered.length ? filtered : cfg.items;
    }

    function resultsNounFor(count) {
      const cfg = getTopicConfig();
      if (state.contentType === 'video')   return count === 1 ? 'video'   : 'videos';
      if (state.contentType === 'article') return count === 1 ? 'article' : 'articles';
      return cfg.resultsNoun;
    }

    function selectionTypeLabel() {
      return state.contentType === 'video' ? 'video'
           : state.contentType === 'article' ? 'article'
           : 'resource';
    }

    function renderSinglePicker(parent) {
      const results = getFilteredItems();
      const initial = results.slice(0, INITIAL_RESULT_COUNT);
      const extras = results.slice(INITIAL_RESULT_COUNT);
      const card = document.createElement('div');
      card.className = 'single-picker';

      const list = document.createElement('div');
      list.className = 'picker-items';
      initial.forEach(function (it, idx) {
        list.appendChild(buildContentRow(it, { multi: false, selected: idx === 0 }));
      });
      card.appendChild(list);

      const footer = document.createElement('div');
      footer.className = 'bundle-footer';
      const moreBtnHtml = extras.length
        ? '<button class="ghost-btn more-btn">View ' + extras.length + ' more result' + (extras.length === 1 ? '' : 's') + ' ↓</button>'
        : '';
      footer.innerHTML =
        '<span class="picker-hint">Click an item to preview it, then confirm.</span>' +
        moreBtnHtml +
        '<button class="primary-btn confirm-btn">Use this ' + selectionTypeLabel() + ' →</button>';
      card.appendChild(footer);

      const moreBtn = footer.querySelector('.more-btn');
      if (moreBtn) {
        moreBtn.addEventListener('click', function () {
          extras.forEach(function (it) {
            list.appendChild(buildContentRow(it, { multi: false, selected: false }));
          });
          moreBtn.remove();
          scrollToBottom();
        });
      }

      footer.querySelector('.confirm-btn').addEventListener('click', function () {
        const chosen = list.querySelector('.content-row.selected');
        if (!chosen) return;
        state.selectedContent = [chosen.dataset.id];
        card.classList.add('locked');
        footer.querySelector('.confirm-btn').textContent = 'Selection confirmed ✓';
        footer.querySelector('.confirm-btn').disabled = true;
        if (moreBtn) moreBtn.disabled = true;
        const chosenTitle = chosen.querySelector('.cr-title').textContent;
        addUserMessage('Use "' + chosenTitle + '"');
        // Collapse the preview panel now that the teacher has confirmed.
        shell.classList.remove('with-artifact');
        currentPreviewId = null;
        document.querySelectorAll('.content-row').forEach(function (r) { r.classList.remove('previewing'); });
        askAboutSupports();
      });

      parent.appendChild(card);
      scrollToBottom();
    }

    // ============================================================
    // Shared content row (for bundle + single picker)
    //  - Bundle (multi): row body click = preview, checkbox click = toggle
    //  - Single (radio): row click = select + preview
    // ============================================================
    function buildContentRow(item, opts) {
      const row = document.createElement('div');
      row.className = 'content-row' + (opts.selected ? ' selected' : '') + (opts.multi ? ' multi' : ' single');
      row.dataset.id = item.id;
      row.dataset.type = item.type;
      const icon = item.type === 'video' ? '▶' : '📄';
      const metaText = item.typeLabel + ' · ' + item.length +
        (item.lexile !== 'N/A' ? ' · Lexile ' + item.lexile : '');
      row.innerHTML =
        '<div class="cr-check" data-role="check">' +
          (opts.multi
            ? '<span class="cr-box"><span class="cr-tick">✓</span></span>'
            : '<span class="cr-radio"><span class="cr-dot"></span></span>') +
        '</div>' +
        '<div class="cr-thumb" style="background-image:linear-gradient(135deg,' + item.gradient[0] + ',' + item.gradient[1] + ');">' +
          '<span class="cr-icon">' + icon + '</span>' +
        '</div>' +
        '<div class="cr-body">' +
          '<div class="cr-title">' + item.title + '</div>' +
          '<div class="cr-meta">' + metaText + '</div>' +
        '</div>' +
        '<div class="cr-grade">' + item.grade + '</div>';

      if (opts.multi) {
        // Checkbox click toggles selection (and does NOT open preview)
        row.querySelector('[data-role="check"]').addEventListener('click', function (e) {
          e.stopPropagation();
          row.classList.toggle('selected');
          // If currently previewing this item, refresh button label
          if (currentPreviewId === item.id) openPreview(item);
        });
        // Row body click previews
        row.addEventListener('click', function () {
          highlightActivePreview(item.id);
          openPreview(item);
        });
      } else {
        // Single-select: click row = select + preview
        row.addEventListener('click', function () {
          const list = row.parentElement;
          list.querySelectorAll('.content-row').forEach(function (r) { r.classList.remove('selected'); });
          row.classList.add('selected');
          highlightActivePreview(item.id);
          openPreview(item);
        });
      }
      return row;
    }

    // Track which item is currently shown in the preview panel
    let currentPreviewId = null;

    function highlightActivePreview(id) {
      currentPreviewId = id;
      document.querySelectorAll('.content-row').forEach(function (r) {
        r.classList.toggle('previewing', r.dataset.id === id);
      });
    }

    // ============================================================
    // Supports selection (after content is confirmed)
    // ============================================================
    function askAboutSupports() {
      setTimeout(function () {
        const lunaEl = addLunaMessage();
        const stepsEl = lunaEl.querySelector('.thinking-steps');
        const textEl = lunaEl.querySelector('.text');
        runSteps(stepsEl, ['Thinking about supporting materials…'], function () {
          const reply = state.flow === 'bundle'
            ? "Great — select in the right side panel which supporting materials you'd like me to create to go with these resources."
            : "Great — select in the right side panel which supporting materials you'd like me to create to go with this content.";
          streamText(textEl, reply, 14, function () {
            if (isV4 || isV3) {
              setPanelMode('materials');
              artTitle.textContent = 'Supporting materials';
              artSub.textContent = 'Choose what to create for your lesson.';
              artBody.innerHTML = buildSelectedContentSection();
              wireStackMenus(artBody);
              artActions.innerHTML = '';
              renderSupportPickerV3(artBody, artActions);
              shell.classList.add('with-artifact');
              const lo = artBody.querySelector('.v3-lo');
              if (lo) lo.focus({ preventScroll: true });
            } else {
              renderSupportPicker(lunaEl.querySelector('.body'));
              const lo = lunaEl.querySelector('.v3-lo');
              if (lo) lo.focus({ preventScroll: true });
            }
            requestAnimationFrame(function () { scrollToBottom(); });
          });
        });
      }, 500);
    }

    function scrollMessageToTop(el) {
      if (!el || !stream) return;
      requestAnimationFrame(function () {
        const target = Math.max(0, el.offsetTop - 16);
        if (typeof stream.scrollTo === 'function') {
          stream.scrollTo({ top: target, behavior: 'smooth' });
        } else {
          stream.scrollTop = target;
        }
      });
    }

    function renderSupportPicker(parent) {
      if (isV4 || isV3) return renderSupportPickerV3(parent);
      const wrap = document.createElement('div');
      wrap.className = 'support-picker';
      const optionsHtml =
        optionHtml('lessonPlan', '📘', 'Lesson plan', 'Learning objective, activities, discussion questions', true) +
        optionHtml('quiz', '✎', 'Printable quiz', 'Auto-generated comprehension questions', true) +
        optionHtml('go', '🗂️', 'Graphic organizer', 'Visual tool for student note-taking', false, 'BETA');
      wrap.innerHTML =
        '<div class="support-options">' + optionsHtml + '</div>' +
        '<div class="support-footer">' +
          '<button class="primary-btn generate-btn">Generate materials →</button>' +
        '</div>';

      wrap.querySelectorAll('.support-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          opt.classList.toggle('selected');
        });
      });

      wrap.querySelector('.generate-btn').addEventListener('click', function () {
        state.supports.lessonPlan = wrap.querySelector('[data-support="lessonPlan"]').classList.contains('selected');
        const quizOpt = wrap.querySelector('[data-support="quiz"]');
        state.supports.quiz = quizOpt ? quizOpt.classList.contains('selected') : false;
        state.supports.go = wrap.querySelector('[data-support="go"]').classList.contains('selected');

        const chosen = [];
        if (state.supports.lessonPlan) chosen.push('lesson plan');
        if (state.supports.quiz) chosen.push('quiz');
        if (state.supports.go) chosen.push('graphic organizer');

        if (chosen.length === 0) {
          const hint = document.createElement('div');
          hint.className = 'inline-hint error';
          hint.textContent = 'Pick at least one resource to continue.';
          wrap.appendChild(hint);
          setTimeout(function () { hint.remove(); }, 2200);
          return;
        }

        wrap.classList.add('locked');
        wrap.querySelector('.generate-btn').textContent = 'Generating ✓';
        wrap.querySelector('.generate-btn').disabled = true;
        addUserMessage('Generate: ' + chosen.join(', '));
        runGeneration();
      });

      parent.appendChild(wrap);
      scrollToBottom();
    }

    // ============================================================
    // V3 support picker — lesson plan selected by default with nested
    // required inputs (objective + standards); graphic organizer
    // reveals a single-select type picker when turned on.
    // ============================================================
    function renderSupportPickerV3(parent, actionsEl) {
      const suggested = suggestedStandards();
      const times = ['30 min', '45 min', '60 min', '90 min'];

      const wrap = document.createElement('div');
      wrap.className = 'support-picker v3';

      const standardsHtml = suggested.map(function (s) {
        return '<button class="v3-std-chip" data-std="' + s + '">' + s + '</button>';
      }).join('');

      const timeHtml = times.map(function (t) {
        return '<button class="v3-time-chip' + (t === '45 min' ? ' selected' : '') + '" data-time="' + t + '">' + t + '</button>';
      }).join('');

      const goListHtml = GO_TYPES.map(function (g) {
        return '<label class="v3-go-type" data-go-id="' + g.id + '">' +
          '<input type="checkbox" name="v3-go-type" value="' + g.id + '">' +
          '<span class="v3-go-radio"></span>' +
          '<span class="v3-go-body">' +
            '<span class="v3-go-label">' + g.label + '</span>' +
            '<span class="v3-go-desc">' + g.desc + '</span>' +
          '</span>' +
        '</label>';
      }).join('');

      wrap.innerHTML =
        '<div class="v3-options">' +
          // Lesson plan option (selected by default, nested inputs)
          '<div class="v3-option selected" data-support="lessonPlan">' +
            '<div class="v3-option-header">' +
              '<span class="v3-check"></span>' +
              '<span class="v3-icon">📘</span>' +
              '<span class="v3-option-info">' +
                '<span class="v3-option-title">Lesson plan</span>' +
                '<span class="v3-option-desc">Learning objective, activities, discussion questions</span>' +
              '</span>' +
            '</div>' +
            '<div class="v3-option-body">' +
              '<div class="v3-field">' +
                '<label class="v3-label">Learning objective <span class="v3-req">*</span></label>' +
                '<textarea class="v3-lo" rows="2" placeholder="In this lesson I want my students to..."></textarea>' +
              '</div>' +
              '<div class="v3-field">' +
                '<label class="v3-label">Standards <span class="v3-req">*</span> <span class="v3-hint">Select up to 3 standards to apply to this lesson.</span></label>' +
                '<div class="v3-std-list">' + standardsHtml + '</div>' +
              '</div>' +
              '<div class="v3-field">' +
                '<label class="v3-label">Allotted time <span class="v3-hint">(optional)</span></label>' +
                '<div class="v3-time-row">' + timeHtml + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          // Graphic organizer option (unselected by default, reveals type picker)
          '<div class="v3-option" data-support="go">' +
            '<div class="v3-option-header">' +
              '<span class="v3-check"></span>' +
              '<span class="v3-icon">🗂️</span>' +
              '<span class="v3-option-info">' +
                '<span class="v3-option-title">Graphic organizer</span>' +
                '<span class="v3-option-desc">Visual tool for student note-taking</span>' +
              '</span>' +
            '</div>' +
            '<div class="v3-option-body">' +
              '<div class="v3-field">' +
                '<label class="v3-label">Organizer type <span class="v3-req">*</span></label>' +
                '<div class="v3-go-list">' + goListHtml + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="support-footer">' +
          '<button class="primary-btn generate-btn">Generate materials →</button>' +
        '</div>';

      // Toggle option selection on header click
      wrap.querySelectorAll('.v3-option-header').forEach(function (h) {
        h.addEventListener('click', function () {
          h.parentElement.classList.toggle('selected');
        });
      });

      // Standards chips — multi-select, max 3
      wrap.querySelectorAll('.v3-std-chip').forEach(function (chip) {
        chip.addEventListener('click', function (e) {
          e.preventDefault();
          const selected = wrap.querySelectorAll('.v3-std-chip.selected');
          if (!chip.classList.contains('selected') && selected.length >= 3) {
            chip.classList.add('shake');
            setTimeout(function () { chip.classList.remove('shake'); }, 400);
            return;
          }
          chip.classList.toggle('selected');
        });
      });

      // Time chips — single-select
      wrap.querySelectorAll('.v3-time-chip').forEach(function (chip) {
        chip.addEventListener('click', function (e) {
          e.preventDefault();
          wrap.querySelectorAll('.v3-time-chip').forEach(function (c) { c.classList.remove('selected'); });
          chip.classList.add('selected');
        });
      });

      // GO type — multi-select
      wrap.querySelectorAll('.v3-go-type').forEach(function (row) {
        row.addEventListener('click', function (e) {
          // Prevent double-toggle when the native checkbox fires its own click
          if (e.target.tagName === 'INPUT') return;
          const input = row.querySelector('input');
          const nowSelected = !row.classList.contains('selected');
          row.classList.toggle('selected', nowSelected);
          if (input) input.checked = nowSelected;
        });
      });

      const genBtn = wrap.querySelector('.generate-btn');
      genBtn.addEventListener('click', function () {
        wrap.querySelectorAll('.inline-hint.error').forEach(function (h) { h.remove(); });
        const lpEl = wrap.querySelector('[data-support="lessonPlan"]');
        const goEl = wrap.querySelector('[data-support="go"]');
        state.supports.lessonPlan = lpEl.classList.contains('selected');
        state.supports.go = goEl.classList.contains('selected');

        const anySelected = state.supports.lessonPlan || state.supports.go;
        if (!anySelected) {
          showPickerError(wrap, 'Pick at least one material to continue.');
          return;
        }

        if (state.supports.lessonPlan) {
          const lpCard = wrap.querySelector('[data-support="lessonPlan"]');
          state.learningObjective = (wrap.querySelector('.v3-lo').value || '').trim();
          state.standards = Array.from(wrap.querySelectorAll('.v3-std-chip.selected')).map(function (c) { return c.dataset.std; });
          const timeEl = wrap.querySelector('.v3-time-chip.selected');
          state.allottedTime = timeEl ? timeEl.dataset.time : '45 min';
          if (!state.learningObjective) {
            showPickerError(wrap, 'Add a learning objective before generating.', lpCard);
            wrap.querySelector('.v3-lo').focus();
            return;
          }
          if (state.standards.length === 0) {
            showPickerError(wrap, 'Select at least one standard before generating.', lpCard);
            return;
          }
        }

        if (state.supports.go) {
          const goCard = wrap.querySelector('[data-support="go"]');
          state.goTypes = Array.from(wrap.querySelectorAll('.v3-go-type.selected'))
            .map(function (r) { return r.dataset.goId; });
          if (state.goTypes.length === 0) {
            showPickerError(wrap, 'Choose at least one graphic organizer type before generating.', goCard);
            return;
          }
        } else {
          state.goTypes = [];
        }

        const chosen = [];
        if (state.supports.lessonPlan) chosen.push('lesson plan');
        if (state.supports.go) {
          const labels = state.goTypes.map(goTypeLabel).filter(Boolean);
          chosen.push(labels.length === 1
            ? 'graphic organizer (' + labels[0] + ')'
            : labels.length + ' graphic organizers (' + labels.join(', ') + ')');
        }

        wrap.classList.add('locked');
        genBtn.innerHTML = 'Generating ✓';
        genBtn.disabled = true;
        addUserMessage('Generate: ' + chosen.join(', '));
        runGeneration();
      });

      if (actionsEl) {
        const footer = wrap.querySelector('.support-footer');
        if (footer) footer.remove();
        actionsEl.appendChild(genBtn);
      }
      parent.appendChild(wrap);
      if (!actionsEl) scrollToBottom();
    }

    // ============================================================
    // V4 content picker — list layout with description
    // ============================================================
    function renderSinglePickerV4(parent) {
      const results = getFilteredItems();
      const initial = results.slice(0, INITIAL_RESULT_COUNT);
      const extras = results.slice(INITIAL_RESULT_COUNT);
      const card = document.createElement('div');
      card.className = 'single-picker v4-picker';

      const list = document.createElement('div');
      list.className = 'results-list';
      initial.forEach(function (it, idx) {
        list.appendChild(buildResultRow(it, { selected: idx === 0 }));
      });
      card.appendChild(list);

      const footer = document.createElement('div');
      footer.className = 'bundle-footer results-footer';
      const searchQuery = encodeURIComponent((state.topic || '') + (state.grade ? ' grade ' + state.grade : ''));
      const searchUrl = 'https://newsela.com/search/#q=' + searchQuery;
      const moreBtnHtml = extras.length
        ? '<button class="ghost-btn more-btn">See more content <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>'
        : '';
      footer.innerHTML =
        '<a class="ghost-btn search-more-btn" href="' + searchUrl + '" target="_blank" rel="noopener" style="display:none">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          ' Search for more content' +
        '</a>' +
        '<div class="footer-right">' +
          moreBtnHtml +
          '<button class="primary-btn confirm-btn">Use selected content <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg></button>' +
        '</div>';
      card.appendChild(footer);

      const searchMoreBtn = footer.querySelector('.search-more-btn');
      const moreBtn = footer.querySelector('.more-btn');
      if (moreBtn) {
        moreBtn.addEventListener('click', function () {
          extras.forEach(function (it) {
            list.appendChild(buildResultRow(it, { selected: false }));
          });
          moreBtn.remove();
          if (searchMoreBtn) searchMoreBtn.style.display = '';
          scrollToBottom();
        });
      }

      footer.querySelector('.confirm-btn').addEventListener('click', function () {
        const chosen = list.querySelector('.result-row.selected');
        if (!chosen) return;
        state.selectedContent = [chosen.dataset.id];
        card.classList.add('locked');
        footer.querySelector('.confirm-btn').innerHTML = 'Selection confirmed ✓';
        footer.querySelector('.confirm-btn').disabled = true;
        if (moreBtn) moreBtn.disabled = true;
        const chosenTitle = chosen.querySelector('.rr-title').textContent;
        addUserMessage('Use "' + chosenTitle + '"');
        shell.classList.remove('with-artifact');
        currentPreviewId = null;
        document.querySelectorAll('.result-row').forEach(function (r) { r.classList.remove('previewing'); });
        askAboutSupports();
      });

      parent.appendChild(card);
      scrollToBottom();
    }

    function buildResultRow(item, opts) {
      const row = document.createElement('div');
      row.className = 'result-row' + (opts.selected ? ' selected' : '');
      row.dataset.id = item.id;
      row.dataset.type = item.type;

      const isVideo = item.type === 'video';
      const lexileVal = (item.lexile && item.lexile !== 'N/A') ? item.lexile : null;
      const checkSvg = '<svg width="11" height="9" viewBox="0 0 11 9" fill="none"><polyline points="1 4.5 4 7.5 10 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      row.innerHTML =
        '<div class="rr-thumb" style="background-image:linear-gradient(135deg,' + item.gradient[0] + ',' + item.gradient[1] + ');">' +
          (isVideo ? '<span class="rr-play">▶</span>' : '') +
          '<span class="rr-type-badge rr-type-' + item.type + '">' + item.typeLabel + '</span>' +
          '<span class="rr-checkbox">' + checkSvg + '</span>' +
        '</div>' +
        '<div class="rr-body">' +
          '<div class="rr-date">' + item.grade + ' · ' + item.typeLabel + '</div>' +
          '<div class="rr-title">' + item.title + '</div>' +
          '<div class="rr-meta-grid">' +
            '<div><div class="rr-meta-label">Maturity level</div><div class="rr-meta-val">' + item.grade + '</div></div>' +
            '<div><div class="rr-meta-label">Reading</div><div class="rr-meta-val">' + (lexileVal ? lexileVal : item.length) + '</div></div>' +
          '</div>' +
        '</div>';

      row.addEventListener('click', function () {
        const parentList = row.parentElement;
        if (parentList) {
          parentList.querySelectorAll('.result-row').forEach(function (r) { r.classList.remove('selected'); });
        }
        row.classList.add('selected');
        currentPreviewId = item.id;
        document.querySelectorAll('.result-row').forEach(function (r) {
          r.classList.toggle('previewing', r.dataset.id === item.id);
        });
        openPreview(item);
      });

      return row;
    }

    function showPickerError(wrap, msg, target) {
      wrap.querySelectorAll('.inline-hint.error').forEach(function (h) { h.remove(); });
      const hint = document.createElement('div');
      hint.className = 'inline-hint error';
      hint.textContent = msg;
      if (target) {
        const body = target.querySelector('.v3-option-body');
        (body || target).appendChild(hint);
        hint.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        const footer = wrap.querySelector('.support-footer');
        if (footer) wrap.insertBefore(hint, footer); else wrap.appendChild(hint);
      }
    }

    function gradeNumber() {
      const g = state.grade || '2nd';
      if (String(g).toUpperCase() === 'K') return 'K';
      const n = String(g).replace(/[^0-9]/g, '');
      return n || '2';
    }

    function suggestedStandards() {
      const n = gradeNumber();
      return [
        'RI.' + n + '.1', 'RI.' + n + '.2', 'RI.' + n + '.3',
        'RI.' + n + '.4', 'RI.' + n + '.7',
        'SL.' + n + '.1', 'SL.' + n + '.2',
        'W.' + n + '.2'
      ];
    }

    function goTypeLabel(id) {
      const t = GO_TYPES.find(function (g) { return g.id === id; });
      return t ? t.label : '';
    }

    function optionHtml(key, icon, title, desc, selected, badge) {
      return '<button class="support-option' + (selected ? ' selected' : '') + '" data-support="' + key + '">' +
        '<div class="so-icon">' + icon + '</div>' +
        '<div class="so-body">' +
          '<div class="so-title">' + title + (badge ? ' <span class="beta-chip">' + badge + '</span>' : '') + '</div>' +
          '<div class="so-desc">' + desc + '</div>' +
        '</div>' +
        '<div class="so-check">✓</div>' +
      '</button>';
    }

    // ============================================================
    // Generation — thinking + stacked artifact panel
    // ============================================================
    function showPanelGenerating(steps) {
      shell.classList.add('with-artifact');
      artTitle.textContent = 'Generating materials…';
      artSub.textContent = 'This will only take a moment';
      artActions.innerHTML = '';

      const skeletonHtml =
        '<div class="panel-skel-card">' +
          '<div class="skel-line" style="height:12px;width:55%;"></div>' +
          '<div class="skel-line" style="height:10px;width:80%;"></div>' +
          '<div class="skel-line" style="height:10px;width:65%;"></div>' +
        '</div>' +
        '<div class="panel-skel-card">' +
          '<div class="skel-line" style="height:12px;width:45%;"></div>' +
          '<div class="skel-line" style="height:10px;width:75%;"></div>' +
        '</div>';

      const stepsHtml = steps.map(function (s) {
        return '<div class="panel-gen-step">' +
          '<div class="panel-gen-step-dot"></div>' +
          '<span>' + s + '</span>' +
        '</div>';
      }).join('');

      artBody.innerHTML =
        '<div class="panel-generating">' +
          '<div class="panel-gen-header">' +
            '<div class="panel-gen-spinner">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>' +
            '</div>' +
            '<div>' +
              '<div class="panel-gen-title">Generating your materials…</div>' +
              '<div class="panel-gen-sub">Luna is crafting your lesson resources</div>' +
            '</div>' +
          '</div>' +
          '<div class="panel-gen-steps">' + stepsHtml + '</div>' +
          '<div class="panel-gen-skeletons">' + skeletonHtml + '</div>' +
        '</div>';

      // Animate steps in sequence
      const stepEls = artBody.querySelectorAll('.panel-gen-step');
      stepEls.forEach(function (el, i) {
        setTimeout(function () {
          el.classList.add('visible', 'active');
          if (i > 0) stepEls[i - 1].classList.remove('active');
          if (i > 0) stepEls[i - 1].classList.add('done');
        }, i * 900);
      });
    }

    function runGeneration() {
      const lunaEl = addLunaMessage();
      const stepsEl = lunaEl.querySelector('.thinking-steps');
      const textEl = lunaEl.querySelector('.text');

      const steps = ['Aligning to CCSS ELA standards for ' + (state.grade || '2nd') + ' grade…'];
      if (state.supports.lessonPlan) steps.push('Drafting learning objective and activities…');
      if (state.supports.go) {
        const goCount = isV3 ? state.goTypes.length : 1;
        steps.push('Building ' + (goCount > 1 ? goCount + ' graphic organizer layouts…' : 'graphic organizer layout…'));
      }
      steps.push('Assembling your materials…');

      showPanelGenerating(steps);

      runSteps(stepsEl, steps, function () {
        let count = 0;
        if (state.supports.lessonPlan) count += 1;
        if (state.supports.go) count += isV3 ? state.goTypes.length : 1;
        const reply = "Your materials are ready — I've opened " + count + " supporting material" + (count === 1 ? '' : 's') +
          " in the side panel alongside your selected content. You can edit, print, or assign from there.";
        // Mark all panel steps done before swapping in real content
        artBody.querySelectorAll('.panel-gen-step').forEach(function (el) {
          el.classList.add('visible', 'done');
          el.classList.remove('active');
        });
        streamText(textEl, reply, 14, function () {
          openStackedArtifact();
          setTimeout(function () {
            var followUp = addLunaMessage();
            streamText(followUp.querySelector('.text'), 'Let me know if there are other classes you need to prepare for.', 18, function () {
              scrollToBottom();
            });
          }, 600);
        });
      });
    }

    function openStackedArtifact() {
      setPanelMode('materials');
      const tCfg = (typeof getTopicConfig === 'function') ? getTopicConfig() : null;
      const tLabel = (tCfg && tCfg.topicLabel) ? tCfg.topicLabel : 'community helpers';
      const tDisplay = (tCfg && tCfg.shortTitle) ? tCfg.shortTitle : (tLabel.charAt(0).toUpperCase() + tLabel.slice(1));
      const titleText = state.flow === 'bundle'
        ? 'Community Helpers Resources'
        : tDisplay + ' Materials';
      artTitle.textContent = titleText;
      artSub.textContent = (state.grade || '2nd') + ' grade ELA · AI-generated materials';

      let html = '';
      html += buildSelectedContentSection();
      if (state.supports.lessonPlan) html += buildLessonPlanSection();
      if (state.supports.quiz) html += buildQuizSection();
      if (state.supports.go) html += buildGoSection();

      artBody.innerHTML = html;
      artActions.innerHTML =
        '<button data-action="copy">Copy all</button>' +
        '<button data-action="print">Print all</button>' +
        '<button data-action="download">Download PDF</button>' +
        '<button data-action="share">Share</button>' +
        '<button class="primary" data-action="assign">+ Assign to class</button>';
      artActions.querySelector('[data-action="print"]').addEventListener('click', function () {
        window.print();
      });
      shell.classList.add('with-artifact');
      currentPreviewId = null;
      document.querySelectorAll('.content-row').forEach(function (r) { r.classList.remove('previewing'); });

      wireStackMenus(artBody);
    }

    // ============================================================
    // Preview mode — shows a content preview modal
    // before the teacher confirms their selection.
    // ============================================================
    function setPanelMode(mode) {
      shell.dataset.panelMode = mode; // 'materials'
    }

    function closePreviewModal() {
      if (previewModal) previewModal.classList.remove('open');
    }

    if (pmClose) pmClose.addEventListener('click', closePreviewModal);
    if (previewModal) {
      previewModal.querySelector('.preview-modal-backdrop').addEventListener('click', closePreviewModal);
    }

    function openPreview(item) {
      if (!previewModal) return;
      currentPreviewId = item.id;

      const typeChip = item.type === 'video' ? 'VIDEO' : 'ARTICLE';
      if (pmTitleText) pmTitleText.textContent = 'Content preview';
      if (pmSub) pmSub.textContent = 'Review before including it in your ' + (state.flow === 'bundle' ? 'resources' : 'assignment');

      const wordInfo = item.wordCount ? (item.wordCount + ' words · ') : '';
      const stdChips = item.standards.map(function (s) {
        return '<span class="standard-chip small">' + s + '</span>';
      }).join('');
      const kwChips = item.keywords.map(function (k) {
        return '<span class="keyword-chip">' + k + '</span>';
      }).join('');

      pmBody.innerHTML =
        '<div class="preview-hero" style="background-image:linear-gradient(135deg,' + item.gradient[0] + ',' + item.gradient[1] + ');">' +
          '<div class="preview-type-chip">' + typeChip + '</div>' +
          (item.type === 'video' ? '<div class="preview-play">▶</div>' : '') +
        '</div>' +
        '<h2 class="preview-title">' + item.title + '</h2>' +
        '<div class="preview-meta-row">' +
          '<span class="meta-pill grade">' + item.grade + '</span>' +
          '<span class="meta-pill">' + item.typeLabel + '</span>' +
          '<span class="meta-pill">' + item.length + '</span>' +
          (item.lexile !== 'N/A' ? '<span class="meta-pill">Lexile ' + item.lexile + '</span>' : '') +
        '</div>' +

        '<div class="preview-section">' +
          '<div class="preview-label">Summary</div>' +
          '<p class="preview-summary">' + item.summary + '</p>' +
        '</div>' +

        '<div class="preview-meta-grid">' +
          '<div>' +
            '<div class="preview-label">Standards alignment</div>' +
            '<div class="chip-row">' + stdChips + '</div>' +
          '</div>' +
          '<div>' +
            '<div class="preview-label">Keywords</div>' +
            '<div class="chip-row">' + kwChips + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="preview-section">' +
          '<div class="preview-label">' + (item.type === 'video' ? 'Video overview' : 'Opening passage') + '</div>' +
          '<div class="preview-excerpt">' + item.excerpt + '</div>' +
          '<div class="preview-read-more">' + wordInfo + 'Full ' + (item.type === 'video' ? 'video' : 'article') + ' available after selection</div>' +
        '</div>';

      // Contextual footer action
      const isSelected = isItemSelectedInPicker(item.id);
      let actionsHtml = '';

      const openTabBtn = '<a class="ghost-btn" href="https://newsela.com" target="_blank" rel="noopener" style="text-decoration:none;">Open content in new tab ↗</a>';
      if (state.flow === 'bundle') {
        if (isSelected) {
          actionsHtml =
            '<button data-action="remove">− Remove from resources</button>' +
            '<span class="in-bundle-chip">Included ✓</span>';
        } else {
          actionsHtml = '<button class="primary" data-action="add">＋ Include this resource</button>';
        }
      } else {
        actionsHtml = '<button class="primary" data-action="use">Use this ' + (item.type === 'video' ? 'video' : 'article') + ' →</button>';
      }
      pmFooter.innerHTML = openTabBtn + actionsHtml;

      const addBtn = pmFooter.querySelector('[data-action="add"]');
      const removeBtn = pmFooter.querySelector('[data-action="remove"]');
      const useBtn = pmFooter.querySelector('[data-action="use"]');

      addBtn && addBtn.addEventListener('click', function () {
        const row = findRowById(item.id);
        if (row) row.classList.add('selected');
        openPreview(item);
      });
      removeBtn && removeBtn.addEventListener('click', function () {
        const row = findRowById(item.id);
        if (row) row.classList.remove('selected');
        openPreview(item);
      });
      useBtn && useBtn.addEventListener('click', function () {
        closePreviewModal();
        const row = findRowById(item.id);
        if (!row) return;
        const confirmBtn = row.closest('.single-picker').querySelector('.confirm-btn');
        if (confirmBtn && !confirmBtn.disabled) confirmBtn.click();
      });

      previewModal.classList.add('open');
    }

    function findRowById(id) {
      return document.querySelector('.content-row[data-id="' + id + '"]') ||
             document.querySelector('.result-row[data-id="' + id + '"]');
    }

    function isItemSelectedInPicker(id) {
      const row = findRowById(id);
      return !!(row && row.classList.contains('selected'));
    }

    function stackMenuHtml(hasAssign) {
      return '<div class="stack-menu">' +
        '<button class="stack-menu-btn" aria-label="More options">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>' +
        '</button>' +
        '<div class="stack-menu-dropdown">' +
          '<button class="stack-menu-item">🖨 Print</button>' +
          '<button class="stack-menu-item">↓ Download</button>' +
          '<button class="stack-menu-item">⎘ Share</button>' +
          (hasAssign ? '<button class="stack-menu-item">＋ Assign</button>' : '') +
        '</div>' +
      '</div>';
    }

    function wireStackMenus(container) {
      container.querySelectorAll('.stack-section').forEach(function (sec) {
        const colBtn = sec.querySelector('.stack-collapse-btn');
        colBtn && colBtn.addEventListener('click', function () {
          sec.classList.toggle('collapsed');
        });
        const menuBtn = sec.querySelector('.stack-menu-btn');
        if (menuBtn) {
          menuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const dropdown = sec.querySelector('.stack-menu-dropdown');
            const isOpen = dropdown.classList.contains('open');
            document.querySelectorAll('.stack-menu-dropdown.open').forEach(function (d) { d.classList.remove('open'); });
            if (!isOpen) dropdown.classList.add('open');
          });
        }
      });
    }

    function buildSelectedContentSection() {
      const allItems = (state.flow === 'bundle' ? COMMUNITY_HELPERS_BUNDLE.items : getTopicConfig().items);
      const selected = allItems.filter(function (i) { return state.selectedContent.indexOf(i.id) !== -1; });

      if (selected.length === 1) {
        const it = selected[0];
        const isVideo = it.type === 'video';
        const lexileHtml = it.lexile && it.lexile !== 'N/A'
          ? '<div class="scc-meta-cell"><span class="scc-meta-label">Lexile</span><span class="scc-meta-value">' + it.lexile + '</span></div>'
          : '';
        return '<div class="selected-content-card">' +
          '<div class="scc-thumb" style="background:linear-gradient(135deg,' + it.gradient[0] + ',' + it.gradient[1] + ');">' +
            (isVideo ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="white" opacity="0.8"><polygon points="5 3 19 12 5 21 5 3"/></svg>' : '') +
          '</div>' +
          '<div class="scc-body">' +
            '<div class="scc-eyebrow">' + it.grade + ' · ' + it.typeLabel + '</div>' +
            '<div class="scc-title">' + it.title + '</div>' +
            '<div class="scc-meta-row">' +
              '<div class="scc-meta-cell"><span class="scc-meta-label">Reading</span><span class="scc-meta-value">' + it.length + '</span></div>' +
              lexileHtml +
            '</div>' +
          '</div>' +
        '</div>';
      }

      const rows = selected.map(function (it) {
        const icon = it.type === 'video' ? '▶' : '📄';
        return '<div class="stack-item">' +
          '<div class="stack-thumb" style="background-image:linear-gradient(135deg,' + it.gradient[0] + ',' + it.gradient[1] + ');">' + icon + '</div>' +
          '<div>' +
            '<div class="stack-item-title">' + it.title + '</div>' +
            '<div class="stack-item-meta">' + it.typeLabel + ' · ' + it.length + '</div>' +
          '</div>' +
          '<div class="grade-chip">' + it.grade + '</div>' +
        '</div>';
      }).join('');

      const label = state.flow === 'bundle' ? 'Your resources' : 'Selected content';
      return '<div class="stack-section">' +
        '<div class="stack-head">' +
          '<button class="stack-collapse-btn"><span class="stack-icon">📚</span>' +
          '<span class="stack-title">' + label + ' (' + selected.length + ')</span>' +
          '<span class="stack-caret"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span></button>' +
        '</div>' +
        '<div class="stack-body">' + rows + '</div>' +
      '</div>';
    }

    function buildLessonPlanSection() {
      const defaultObjective = 'Students will identify different community helpers, describe the roles they play in the community, and explain why their work is important.';
      const defaultStandards = ['CCSS.ELA-LITERACY.RI.2.1', 'CCSS.ELA-LITERACY.RI.2.3', 'CCSS.ELA-LITERACY.SL.2.2'];
      const objectiveText = isV3 && state.learningObjective
        ? 'Students will ' + state.learningObjective.replace(/^students will\s+/i, '')
        : defaultObjective;
      const standards = isV3 && state.standards.length
        ? state.standards.map(function (s) { return 'CCSS.ELA-LITERACY.' + s; })
        : defaultStandards;
      const standardsHtml = '<div class="standards-chips">' +
        standards.map(function (s) {
          return '<span class="standard-chip">' + s + '</span>';
        }).join('') +
        '</div>';
      const timeSuffix = isV3 ? ' · ' + state.allottedTime : '';
      return '<div class="stack-section">' +
        '<div class="stack-head">' +
          '<button class="stack-collapse-btn"><span class="stack-icon">📘</span>' +
          '<span class="stack-title">Lesson plan' + timeSuffix + '</span>' +
          '<span class="stack-caret"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span></button>' +
          stackMenuHtml(false) +
        '</div>' +
        '<div class="stack-body">' +
          '<div class="lp-section"><h4>Standards</h4>' + standardsHtml + '</div>' +
          '<div class="lp-section"><h4>Learning objective</h4>' +
            '<p>' + escapeHtml(objectiveText) + '</p>' +
          '</div>' +
          '<div class="lp-section"><h4>Before reading (10 min)</h4>' +
            '<p>Ask students: "Who are some helpers you see in your neighborhood?" Create a class anchor chart of their answers.</p>' +
          '</div>' +
          '<div class="lp-section"><h4>Reading activity (20 min)</h4>' +
            '<p>Read the selected content together. As you read, pause to ask students what job each helper does and how they help the community. Underline one new word together.</p>' +
          '</div>' +
          '<div class="lp-section"><h4>Discussion questions</h4><ul>' +
            '<li>What is one thing this community helper does for us?</li>' +
            '<li>How would our community be different without them?</li>' +
            '<li>What community helper would you want to be? Why?</li>' +
          '</ul></div>' +
          '<div class="lp-section"><h4>Exit ticket</h4>' +
            '<p>Draw a picture of a community helper and write one sentence about how they help others.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function buildQuizSection() {
      return '<div class="stack-section">' +
        '<div class="stack-head">' +
          '<button class="stack-collapse-btn"><span class="stack-icon">✎</span>' +
          '<span class="stack-title">Printable quiz</span>' +
          '<span class="stack-caret"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span></button>' +
          stackMenuHtml(true) +
        '</div>' +
        '<div class="stack-body">' +
          '<p class="stack-intro">5 comprehension questions · Answer key included</p>' +
          '<div class="quiz-q"><div class="qn">1.</div><div><div class="qt">Who are community helpers?</div>' +
            '<div class="qc">A. People who live far away</div>' +
            '<div class="qc">B. People who have jobs that help others in our community</div>' +
            '<div class="qc">C. Animals in our neighborhood</div>' +
            '<div class="qc">D. Students at our school</div>' +
          '</div></div>' +
          '<div class="quiz-q"><div class="qn">2.</div><div><div class="qt">What does a firefighter do? (Choose all that apply)</div>' +
            '<div class="qc">☐ Puts out fires</div>' +
            '<div class="qc">☐ Rescues people in danger</div>' +
            '<div class="qc">☐ Delivers mail</div>' +
            '<div class="qc">☐ Teaches fire safety</div>' +
          '</div></div>' +
          '<div class="quiz-q"><div class="qn">3.</div><div><div class="qt">Name one tool a community helper uses in their job.</div>' +
            '<div class="qc write">_______________________________________</div>' +
          '</div></div>' +
          '<div class="quiz-q"><div class="qn">4.</div><div><div class="qt">True or False: All community helpers wear a uniform.</div>' +
            '<div class="qc">○ True</div>' +
            '<div class="qc">○ False</div>' +
          '</div></div>' +
          '<div class="quiz-q"><div class="qn">5.</div><div><div class="qt">Write one sentence about why community helpers are important.</div>' +
            '<div class="qc write">_______________________________________</div>' +
            '<div class="qc write">_______________________________________</div>' +
          '</div></div>' +
        '</div>' +
      '</div>';
    }

    function buildGoSection() {
      if (!isV3) {
        return '<div class="stack-section">' +
          '<div class="stack-head">' +
            '<button class="stack-collapse-btn"><span class="stack-icon">🗂️</span>' +
            '<span class="stack-title">Graphic organizer <span class="beta-chip inline">BETA</span></span>' +
            '<span class="stack-caret"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span></button>' +
            stackMenuHtml(true) +
          '</div>' +
          '<div class="stack-body">' +
            (state.selectedContent.length > 1 ? '<div class="go-notice">Graphic organizers in bundled assignments are still in beta — formatting may vary. Expected GA: Q3 2026.</div>' : '') +
            defaultCommunityHelperGoHtml() +
          '</div>' +
        '</div>';
      }
      const ids = state.goTypes.length ? state.goTypes : [null];
      return ids.map(function (id) {
        const label = goTypeLabel(id) || 'Community helper web';
        return '<div class="stack-section">' +
          '<div class="stack-head">' +
            '<button class="stack-collapse-btn"><span class="stack-icon">🗂️</span>' +
            '<span class="stack-title">Graphic organizer · ' + label + '</span>' +
            '<span class="stack-caret"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span></button>' +
            stackMenuHtml(true) +
          '</div>' +
          '<div class="stack-body">' + renderGoTemplate(id) + '</div>' +
        '</div>';
      }).join('');
    }

    function defaultCommunityHelperGoHtml() {
      return '<div class="go-grid">' +
        '<div class="go-cell go-center"><div class="go-cell-label">COMMUNITY HELPER</div><div class="go-cell-line">_______________</div></div>' +
        '<div class="go-cell"><div class="go-cell-label">What do they do?</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Where do they work?</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Tools they use</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Why is their job important?</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
      '</div>';
    }

    function renderGoTemplate(type) {
      switch (type) {
        case 'anticipation-guide': return goAnticipationGuide();
        case 'central-idea':       return goCentralIdea();
        case 'cer-chart':          return goCerChart();
        case 'compare-contrast':   return goCompareContrast();
        case 'context-clues':      return goContextClues();
        case 'frayer-model':       return goFrayerModel();
        case 'kwl-chart':          return goKwlChart();
        default:                   return defaultCommunityHelperGoHtml();
      }
    }

    function goAnticipationGuide() {
      const stmts = [
        'Community helpers only include police and firefighters.',
        'All community helpers wear a uniform to work.',
        'A teacher is a type of community helper.',
        'Community helpers are only found in big cities.'
      ];
      const rows = stmts.map(function (s, i) {
        return '<tr>' +
          '<td class="ag-num">' + (i + 1) + '</td>' +
          '<td class="ag-stmt">' + s + '</td>' +
          '<td class="ag-choice">○ Agree &nbsp; ○ Disagree</td>' +
          '<td class="ag-choice">○ Agree &nbsp; ○ Disagree</td>' +
        '</tr>';
      }).join('');
      return '<table class="go-table">' +
        '<thead><tr><th></th><th>Statement</th><th>Before reading</th><th>After reading</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
    }

    function goCentralIdea() {
      return '<div class="go-grid">' +
        '<div class="go-cell go-center"><div class="go-cell-label">Central idea</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Supporting detail 1</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Supporting detail 2</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Supporting detail 3</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Supporting detail 4</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
      '</div>';
    }

    function goCerChart() {
      return '<div class="go-cer">' +
        '<div class="go-cell"><div class="go-cell-label">Claim</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Evidence</div><div class="go-cell-line"></div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Reasoning</div><div class="go-cell-line"></div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
      '</div>';
    }

    function goCompareContrast() {
      return '<div class="go-cc">' +
        '<div class="go-cell"><div class="go-cell-label">Subject A</div><div class="go-cell-line"></div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Both</div><div class="go-cell-line"></div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">Subject B</div><div class="go-cell-line"></div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
      '</div>';
    }

    function goContextClues() {
      const rows = [1, 2, 3].map(function (n) {
        return '<tr>' +
          '<td class="cc-cell"><em>Unknown word ' + n + '</em><div class="cc-line"></div></td>' +
          '<td class="cc-cell"><em>Sentence from the text</em><div class="cc-line"></div><div class="cc-line"></div></td>' +
          '<td class="cc-cell"><em>My guess</em><div class="cc-line"></div></td>' +
          '<td class="cc-cell"><em>Actual meaning</em><div class="cc-line"></div></td>' +
        '</tr>';
      }).join('');
      return '<table class="go-table">' +
        '<thead><tr><th>Word</th><th>Sentence / clue</th><th>My guess</th><th>Actual meaning</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
    }

    function goFrayerModel() {
      return '<div class="go-frayer">' +
        '<div class="frayer-center">Word / concept<div class="go-cell-line"></div></div>' +
        '<div class="frayer-cell"><div class="go-cell-label">Definition</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="frayer-cell"><div class="go-cell-label">Characteristics</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="frayer-cell"><div class="go-cell-label">Examples</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="frayer-cell"><div class="go-cell-label">Non-examples</div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
      '</div>';
    }

    function goKwlChart() {
      return '<div class="go-cer">' +
        '<div class="go-cell"><div class="go-cell-label">K — What I know</div><div class="go-cell-line"></div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">W — What I want to know</div><div class="go-cell-line"></div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
        '<div class="go-cell"><div class="go-cell-label">L — What I learned</div><div class="go-cell-line"></div><div class="go-cell-line"></div><div class="go-cell-line"></div></div>' +
      '</div>';
    }

    // ============================================================
    // Follow-up handling (post-generation chat)
    // ============================================================
    function runFollowUpResponse(userPrompt) {
      const lunaEl = addLunaMessage();
      const stepsEl = lunaEl.querySelector('.thinking-steps');
      const textEl = lunaEl.querySelector('.text');
      const steps = ['Reviewing your request…', 'Updating your materials…'];
      runSteps(stepsEl, steps, function () {
        const reply = "Done — I updated the materials in the side panel. Anything else?";
        streamText(textEl, reply, 14);
      });
    }

    // ============================================================
    // Content data
    // ============================================================
    const COMMUNITY_HELPERS_BUNDLE = {
      title: 'Community Helpers in Our Neighborhood',
      items: [
        { id: 'ch-1', type: 'article', typeLabel: 'Article', title: 'Meet the firefighters keeping our neighborhood safe', length: '4 min read', grade: 'Gr 2', gradient: ['#ffb199','#ffd8c8'],
          lexile: '420L', wordCount: 312, standards: ['RI.2.1','RI.2.3'], keywords: ['firefighters','safety','rescue','community'],
          summary: 'A look inside a local firehouse, including the trucks, tools, and teamwork firefighters rely on to keep their community safe.',
          excerpt: 'When there is a fire, firefighters are the first people to help. They wear big, strong suits called "turnout gear" that keep them safe from heat and smoke. Firefighters work together as a team. One may drive the truck. Another may connect the long hose to a hydrant. A third may help people get out of a building safely. Their job is more than just putting out fires — they also rescue people, teach fire safety, and help after car accidents.' },
        { id: 'ch-2', type: 'article', typeLabel: 'Article', title: 'Doctors and nurses: Helpers who keep us healthy', length: '3 min read', grade: 'Gr 2', gradient: ['#bcd8ff','#e8d8ff'],
          lexile: '410L', wordCount: 285, standards: ['RI.2.1','RI.2.3'], keywords: ['doctors','nurses','health','hospital'],
          summary: 'An introduction to doctors and nurses — what they do, the tools they use, and why regular checkups help kids stay healthy.',
          excerpt: 'Doctors and nurses are helpers who take care of us when we are sick. They also help us stay healthy. Have you ever been to a doctor for a checkup? The doctor might listen to your heart with a tool called a stethoscope. A nurse might measure how tall you are getting. Doctors and nurses work in hospitals, clinics, and even schools. Every day, they help people feel better.' },
        { id: 'ch-3', type: 'video',   typeLabel: 'Video',   title: 'A day in the life of a mail carrier', length: '2 min watch', grade: 'Gr 2', gradient: ['#d9eaff','#c0d0ff'],
          lexile: 'N/A', wordCount: null, standards: ['SL.2.2','RI.2.3'], keywords: ['mail carrier','post office','delivery'],
          summary: 'Follow Maria, a mail carrier, as she shows the route she walks each day and the people she meets along the way.',
          excerpt: 'In this 2-minute video, students follow a mail carrier named Maria from the moment she arrives at the post office to the final stop on her delivery route. The video covers sorting mail, loading the truck, and the variety of people a mail carrier sees in a single day.' },
        { id: 'ch-4', type: 'article', typeLabel: 'Article', title: 'Teachers: Helpers who guide our learning', length: '4 min read', grade: 'Gr 2', gradient: ['#d0d8ff','#f1c7ff'],
          lexile: '440L', wordCount: 340, standards: ['RI.2.1','RI.2.3','SL.2.2'], keywords: ['teachers','school','learning'],
          summary: 'A close look at what teachers do before, during, and after the school day to support student learning.',
          excerpt: 'Teachers are community helpers, too. A teacher plans lessons, reads books, and helps students solve problems. But a teacher\'s day begins long before the bell rings. They check papers, set up the classroom, and think about how to make each lesson fun. After school, teachers keep working — planning for tomorrow and meeting with families.' },
        { id: 'ch-5', type: 'video',   typeLabel: 'Video',   title: 'How sanitation workers keep our city clean', length: '3 min watch', grade: 'Gr 2', gradient: ['#c2e4ff','#d9eaff'],
          lexile: 'N/A', wordCount: null, standards: ['SL.2.2','RI.2.3'], keywords: ['sanitation','trash','recycling','city'],
          summary: 'A behind-the-scenes look at the sanitation crew that keeps a neighborhood clean — from early-morning pickups to recycling.',
          excerpt: 'This 3-minute video shows sanitation workers as they start their early-morning shift. Students will see how trucks are loaded, how recycling is sorted, and why this work is so important to a clean, safe community.' }
      ]
    };

    function detectTopicKey(prompt) {
      const p = (prompt || '').toLowerCase();
      if (/\brl[\s._-]*4[\s._-]*5\b|\brl\.?\s*4\.?\s*5\b/.test(p)) return 'rl-4-5';
      if (/water cycle|raindrop|evaporat|condensat|precipitat/.test(p)) return 'water-cycle';
      if (/firefighter|community helper|first responder/.test(p)) return 'firefighters';
      return 'mayflower';
    }

    // Returns 'article' or 'video' if the prompt explicitly asks for one type;
    // null means mixed/unspecified.
    function detectContentType(prompt) {
      const p = (prompt || '').toLowerCase();
      const hasVideo = /\bvideos?\b|\bwatch\b/.test(p);
      const hasArticle = /\barticles?\b|\btext\b|\bread(ing)?\b/.test(p);
      if (hasVideo && !hasArticle) return 'video';
      if (hasArticle && !hasVideo) return 'article';
      return null;
    }

    function getTopicConfig() {
      return SINGLE_RESULTS_BY_TOPIC[state.topicKey] || SINGLE_RESULTS_BY_TOPIC.mayflower;
    }

    // ============================================================
    // Helpers
    // ============================================================
    function lastMsgSender() {
      const msgs = stream.querySelectorAll('.msg');
      if (!msgs.length) return null;
      const last = msgs[msgs.length - 1];
      return last.classList.contains('luna') ? 'luna' : 'user';
    }

    function addUserMessage(text) {
      const el = document.createElement('div');
      const consecutive = lastMsgSender() === 'user';
      el.className = 'msg user' + (consecutive ? ' consecutive' : '');
      el.innerHTML =
        (consecutive ? '' : '<div class="avatar">CM</div>') +
        '<div class="body">' + (consecutive ? '' : '<div class="name">You</div>') +
        '<div>' + escapeHtml(text) + '</div></div>';
      stream.appendChild(el);
      scrollToBottom();
    }

    function addLunaMessage() {
      const el = document.createElement('div');
      const consecutive = lastMsgSender() === 'luna';
      el.className = 'msg luna' + (consecutive ? ' consecutive' : '');
      el.innerHTML =
        (consecutive ? '' : '<div class="avatar">L</div>') +
        '<div class="body">' + (consecutive ? '' : '<div class="name">Luna</div>') +
        '<div class="thinking-steps"></div>' +
        '<div class="text"></div>' +
        '</div>';
      stream.appendChild(el);
      scrollToBottom();
      return el;
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, function (c) {
        return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
      });
    }

    function scrollToBottom() { stream.scrollTop = stream.scrollHeight; }

    function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

    function normalizeGrade(g) {
      const m = { 'k': 'K', 'kindergarten': 'K' };
      return m[g.toLowerCase()] || g;
    }

    function runSteps(container, steps, onDone) {
      let i = 0;
      function nextStep() {
        if (i >= steps.length) {
          if (container.lastChild) container.lastChild.classList.add('done');
          setTimeout(function () {
            container.classList.add('collapse');
            setTimeout(function () { onDone && onDone(); }, 420);
          }, 480);
          return;
        }
        const step = document.createElement('div');
        step.className = 'step';
        step.innerHTML = '<span class="dot"></span><span class="text">' + steps[i] + '</span>';
        container.appendChild(step);
        requestAnimationFrame(function () { step.classList.add('show'); });
        scrollToBottom();
        if (i > 0) container.children[i - 1].classList.add('done');
        i++;
        setTimeout(nextStep, 600 + Math.random() * 300);
      }
      nextStep();
    }

    function streamText(el, text, speed, onDone) {
      el.classList.add('streaming');
      let i = 0;
      function tick() {
        if (i > text.length) {
          el.classList.remove('streaming');
          onDone && onDone();
          return;
        }
        el.innerHTML = text.slice(0, i).replace(/\n/g, '<br>');
        i += Math.max(1, Math.round(Math.random() * 3));
        scrollToBottom();
        setTimeout(tick, speed);
      }
      tick();
    }
  };

  // -------- Luna V4 entry points --------
  window.initLunaV4 = function () {
    window.initLuna({ v4: true });
  };

  window.initHomepageV4 = function () {
    const input = document.getElementById('hero-input');
    const submit = document.getElementById('hero-submit');
    const chips = document.querySelectorAll('[data-chip-prompt]');
    const cards = document.querySelectorAll('[data-capability]');

    function go(prompt) {
      window.location.href = 'luna-v4.html?prompt=' + encodeURIComponent(prompt);
    }

    if (submit) {
      submit.addEventListener('click', function () {
        const v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        go(v);
      });
    }
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit.click();
        }
      });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        go(c.getAttribute('data-chip-prompt'));
      });
    });
    cards.forEach(function (c) {
      c.addEventListener('click', function () {
        const cap = c.getAttribute('data-capability');
        if (cap === 'lesson-planner') go('Help me plan a 45-minute lesson on photosynthesis for 5th graders');
        else if (cap === 'text-set') go('Build a text set on civil rights for 7th grade ELA');
        else if (cap === 'text-leveler') window.location.href = 'leveler.html';
      });
    });
  };
})();
