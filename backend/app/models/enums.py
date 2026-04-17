import enum


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class Role(str, enum.Enum):
    admin = "admin"
    contributor = "contributor"
    viewer = "viewer"


class RelationshipType(str, enum.Enum):
    marriage = "marriage"
    parent_child = "parent_child"


class MarriageStatus(str, enum.Enum):
    active = "active"
    divorced = "divorced"
    separated = "separated"


class ApprovalStatus(str, enum.Enum):
    approved = "approved"
    pending = "pending"
    quarantined = "quarantined"


class ContributionType(str, enum.Enum):
    person_add = "person_add"
    relationship_add = "relationship_add"
    field_edit = "field_edit"
    message = "message"


class ContributionStatus(str, enum.Enum):
    pending = "pending"
    draft = "draft"
    approved = "approved"
    approved_with_changes = "approved_with_changes"
    rejected = "rejected"


class RevisionAction(str, enum.Enum):
    create = "create"
    update = "update"
    rollback = "rollback"


class InviteStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
