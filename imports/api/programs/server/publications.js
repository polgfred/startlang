'use strict';

import Programs from '..';

Meteor.publish('programs.mine', function() {
  return Programs.find({ userId: this.userId });
});
