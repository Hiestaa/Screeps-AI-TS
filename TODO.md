* Ensure Tower agent, tasks, and add to defense objective work as expected (test with invaders)
* Make sure storage is properly replacing spawn container and roads aren't replacing buildings at their ends
* Proper road planning from start - avoid non-rampart buildings from the entire plan of the spawn fortress
  - smarter connections: connect spawn to closest source / sink, then each subsequent unconnected source / sink to the closest connected source / sink.0
  - ensure that works: don't replace roads at each RCL only set them once and remember where they are and rebuild if get broken
  - Ensure is working by going all the way to RCL8
* ensure that works: Don't waste time building rampart all the way to max hits, it's taking too long. Do so by strate until RCL8.
* test: limit harvester body parts to the max to deplete a source until it get refilled
* test: fix attempts to spawn creeps with > 50 body parts
* Apply Resource reservation system to build and repair tasks
* State management: associate an id to construction site tasks which set a value in a central store when completed. Same for room level change, and other interesting events
  - halve the number of move parts on haulers and workers when roads are complete
* two-threshold system for the repair task - repair up to X, then let decay down to Y < X
* Smarter rampart placement to protect the room:
  - use wall if the rampart will span over more than 5 consecutive tiles, as walls cannot be destroyed
* Consider expansion to other rooms
