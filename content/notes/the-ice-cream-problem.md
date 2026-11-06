---
title: The Ice Cream Problem
date: 2026-11-06
description: Why opinionated defaults make a powerful platform usable, from building DevKit at Eigen Labs.
---

When I worked at Eigen Labs, we had a powerful platform that people were having trouble using.

EigenLayer let developers build services on top of Ethereum’s security. There was a great deal you could do with it. But when I started talking to developers about why they weren’t getting further, the same problem kept appearing: they had to figure out too much before they could build anything.

The platform could accommodate many different approaches. It offered less help choosing one.

The people who got through this were often researchers, unusually persistent engineers, or hobbyists who found the technology interesting enough to explore for its own sake. They were willing to spend time understanding the system before deciding what to do with it.

That was a useful audience. But it was a peculiar requirement to impose on every prospective customer.

We wanted developers to build applications. First, we were asking them to become experts in our infrastructure.

I began to think about it as an ice cream problem.

Imagine wanting ice cream and being handed instructions for churning cream, processing cacao, and making sprinkles. All the ingredients are available. You have complete control over the result. You may also need to make a bowl.

Some people would love this. They would experiment with the process and probably invent something interesting. Most people would leave, because they had come for ice cream.

An ice cream shop makes a series of decisions on your behalf. It chooses ingredients, develops recipes, buys equipment, and works out how to serve the result. You still get to choose a flavor and add toppings. But your choices begin at a point where they’re useful to you.

That was the idea behind DevKit, the developer tool I created for EigenLayer. We would choose sensible defaults, assemble the pieces, and give developers a practical way to get started.

We would have opinions.

Adoption and engagement rose. More developers got through the funnel, and more of them went on to build working services. The underlying platform hadn’t suddenly become more powerful. We had made more of its power accessible.

I think about that distinction a lot.

People building platforms tend to value flexibility. This is understandable. They can see all the things the technology might do, and they don’t want to rule any of them out. Each additional option preserves a possibility.

But an option also creates a decision. Someone has to make it.

If the product team doesn’t, the customer will have to. And the customer usually knows less about the system than the people who built it.

What looks like flexibility from inside a company can feel like unfinished work from outside it.

This is especially easy to miss in developer products, because developers are capable of doing the work. They can read the documentation, connect the components, and write the missing code. Their ability to compensate for a product’s shortcomings can conceal those shortcomings.

But being able to do something is different from wanting to spend your afternoon doing it.

A developer might care deeply about the application they’re building and very little about several decisions required to get it running. Those decisions still matter. In fact, they may matter enough that someone with more experience should make them.

This is what I mean by opinionation: a willingness to turn what you know into decisions that help someone else proceed.

It isn’t the same as removing every option. An ice cream shop with one flavor has an opinion, but so does one with twenty. The useful question is where to put the choices.

With DevKit, we wanted developers to reach a working starting point before asking them to understand every way they might depart from it. Once they had something running, the alternatives became easier to evaluate. They had a concrete system to reason about.

A default gave them somewhere to stand.

Of course, defaults can be wrong. Making a decision for someone is only helpful if you understand enough about what they’re trying to do. Otherwise, opinionation becomes an obstacle of its own: a product that confidently directs you somewhere you don’t want to go.

The work is deciding which choices you can make well on the user’s behalf, and which require knowledge only the user has.

After working on DevKit, I started noticing these decisions everywhere.

I recently bought a car. At some point, someone had to decide what a brief touch of the turn signal should do. How many times should it blink? What should cancel it? What should happen if the driver does something else halfway through?

A driver encounters the result in a second. Arriving at that result may have required prototypes, arguments, testing, and revisions.

You could expose all of those decisions as settings. For a few drivers, that might be useful. For everyone else, you would have turned a moment of driving into a small engineering assignment.

Instead, someone chooses. You change lanes and continue thinking about where you’re going.

Roads contain the same kind of accumulated judgment. Lane markings, signs, and signals let strangers coordinate without negotiating each encounter. A dashed line carries an instruction that would take much longer to explain in words. Once you’ve learned it, you can use it almost without thinking.

These systems are so familiar that it’s easy to forget how many decisions they contain. We experience their usefulness as an absence of effort.

That may be why opinionation receives less attention than it deserves. You can demonstrate a feature. It’s harder to demonstrate the decision a customer never had to stop and make.

Yet those spared decisions add up. They determine whether someone spends an afternoon getting started or gives up before anything works. They determine how much attention remains for the thing the person actually came to do.

As a founder and product builder, I find something wonderful about this. Someone studies a problem, develops a view of how it should work, and makes that view concrete. Eventually, another person encounters the result and proceeds without much difficulty.

The judgment is still there. It has become part of the product.

When I use something that works especially well, I’ve started wondering about the people who made those decisions. What did they notice? What did they argue about? Which detail took three attempts to get right?

I may never know. I get to benefit from what they figured out anyway.
