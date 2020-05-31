* Ensure Tower agent, tasks, and add to defense objective work as expected (test with invaders)
* Proper road planning from start - avoid non-rampart buildings from the entire plan of the spawn fortress
  - smarter connections: connect spawn to closest source / sink, then each subsequent unconnected source / sink to the closest connected source / sink.0
  - Ensure is working by going all the way to RCL8
* test: limit harvester body parts to the max to deplete a source until it get refilled
* test: fix attempts to spawn creeps with > 50 body parts
* Apply Resource reservation system to build and repair tasks - maybe not necessary with repair using a two-threshold approach to target selection?
* State management: associate an id to construction site tasks which set a value in a central store when completed. Same for room level change, and other interesting events
  - halve the number of move parts on haulers and workers when roads are complete
* State management: associate an id to construction site tasks which set a value in a central store when completed. Same for room level change, and other interesting events
  - halve the number of move parts on haulers and workers when roads are complete
* Smarter rampart placement to protect the room:
  - use wall if the rampart will span over more than 5 consecutive tiles, as walls cannot be destroyed
* Consider expansion to other rooms
  - remote mining
  - colony expansion
