---
title: New Products
date: 2023-02-23
description: Thoughts on launching new products: my product development process, from the first idea to the final product.
---

> **A note from 2026:** I wrote this in early 2023, before AI reshaped how products get built. My process looks very different today. I'm keeping this up as a historical record of how I worked in the pre-AI era.

Thoughts on launching new products. Here's a look at my product development process, from the first idea to the final product.

## Plan

![James' discovery process](/img/plan.png)

*James' discovery process*

1.  Define initial product vision, goals, & user personas
    1.  What are we setting out to do and why?

    2.  What might a long-term product mission look like?

    3.  Who are we aiming to help?

2.  Speak to users - early and often. Ask questions.
    1.  Resources I love for product discovery:
        1.  [*The Mom Test*](https://www.amazon.com/The-Mom-Test-Rob-Fitzpatrick-audiobook/dp/B07RJZKZ7F), Rob Fitzpatrick

        2.  [*5 Whys*](https://web.archive.org/web/20240508200432/https://www.productboard.com/glossary/five-whys/), Taiichi Ohno

        3.  [*The Lean Startup*](https://www.amazon.com/Lean-Startup-Entrepreneurs-Continuous-Innovation/dp/0307887898)*,* Eric Reis

3.  Inventory current pain points. Assess the severity, impact, and frequency of pain points. Prioritize ruthlessly.

4.  Form themes and hypotheses around themes.

## Partner

1.  Partner with business stakeholders
    1.  Business goal alignment: how might the introduction of a new product help or hinder existing company goals? Are we performing due diligence and communicating the product vision effectively to leadership for buy-in?

    2.  Establish a Steering Committee: comprised of project leads, plus company leadership. The purpose of the steering co. is to provide regular check-ins with leadership and relevant business leads for progress updates, brainstorming, and product feedback. Steering co. meets on a regular cadence — usually monthly.

2.  Partner with design. Build low-fidelity prototypes. Test with users.
    1.  Important to not put engineering “hands on keyboards” before features are validated with users. Fail fast!

3.  Partner with engineering.
    1.  Assess feasibility: ensure features are technically viable to create and do not cause system slowness or otherwise negative user experience.

    2.  Discuss resourcing: understand current engineering priorities and agree upon appropriate team staffing.

## Execute

1.  Prioritize features - shape the MVP.
    1.  Seed the backlog foundational user stories

    2.  Partner with design on high-fidelity prototypes

    3.  For a given user journey - bucket features into “must haves”, “performance”, and “delighter” features ([kano model](https://www.google.com/search?q=kano+model)).

2.  Build!
    1.  Agile ceremonies to consider:
        1.  Backlog refinement: to ensure a healthy product backlog of epics, user stories, and bugs — ranked in priority order. Owned by product team in collaboration with tech lead.

        2.  Sprint planning: deciding the proper mix of stories to include in each sprint iteration. Depends on story complexity and team capacity. Co-owned by product and tech leads, with participation by engineering and design.

        3.  Daily Standups: (don’t have to be daily) - Check in on what you accomplished yesterday, what you plan to do today, and any blockers. Meeting is led by tech lead, with participation from product, engineering, design, and QA.

        4.  Sprint review: engineering’s chance to brag about the cool stuff they shipped! Product, engineering, design, QA, and the occasional relevant business stakeholder.

        5.  Retrospective: an opportunity to reflect on what is going well, what isn’t going well, and potential next steps. Participation from product, engineering, design, and QA.

## Iterate, Launch, Iterate

1.  More user testing :)
    1.  Usability testing (users are now in the driver's seat) to uncover feature gaps and potential bugs.

    2.  Run experiments: A/B testing with treatment groups vs. control groups

![Experiment design](/img/test.png)

*Experiment design*

1.  [Dogfooding](https://en.wikipedia.org/wiki/Eating_your_own_dog_food) and UAT testing.
    1.  Partner with QA on regression suite and acceptance testing.

    2.  Document bugs and assess impact.

2.  Launch 🚀
    1.  Partnerships & Collaboration:
        1.  Marketing: does marketing have all the market, user, and product context to go to market? Are they set up for success with the proper tooling for growth?

            ![Marketing channels by product maturity](/img/marketing.png)

            *Marketing channels are a function of product maturity*

        2.  Support: is support aware of the launch and potential day-one bugs? Is there sufficient internal or external documentation?

    2.  Launch strategy:
        1.  Hypothesis-driven micro launches. Start small and expand via learnings!

            ![Hypothesis-driven micro launches](/img/hypothesis.png)

            *Micro launches enable risk reduction*

        2.  Rollback and contingency planning

        3.  Ensure event logging/metrics tracking are implemented

        4.  Perform user outreach. Collect feedback. Synthesize into learnings.
            1.  Survey, email, 1:1 sessions

3.  Prioritize future product iterations
    1.  Refine user stories and define acceptance criteria

    2.  User interviews (try for weekly)

    3.  Prioritize backlog based on potential reach, impact, confidence, and effort ([RICE method](https://www.productplan.com/glossary/rice-scoring-model/))

    4.  Determine the right mix of bugs vs. enhancements to include each sprint ([painkillers vs. vitamins](https://medium.com/strategy-dynamics/painkillers-vs-vitamins-d3bdc76ddd31)). Weigh against existing tech debt initiatives.
